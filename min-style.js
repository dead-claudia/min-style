/* global document, module, require, define, Uint8Array, crypto, msCrypto */
;(function (global, factory) { // eslint-disable-line no-extra-semi
    "use strict"

    /* eslint-disable no-undef */

    if (typeof module === "object" && module != null && module.exports) {
        module.exports = factory()
    } else if (typeof define === "function" && define.amd) {
        define("@isiahmeadows/min-style", [], factory)
    } else {
        global.minStyle = factory()
    }

    /* eslint-enable no-undef */
})(this, function () { // eslint-disable-line max-statements
    "use strict"

    // Parts are adapted from node-uuid's v4 implementation, but moved here to
    // avoid taking in a runtime dependency.

    var hasOwn = Object.prototype.hasOwnProperty
    var b2h = new Array(256)

    for (var i = 0; i < 256; i++) {
        b2h[i] = (i + 256).toString(16).slice(0, 2)
    }

    var rnds, rng, cryptoLib

    if (typeof require === "function") {
        // Node.js crypto
        cryptoLib = require("crypto") // eslint-disable-line global-require
        rng = function () {
            rnds = cryptoLib.randomBytes(16)
        }
    } else {
        if (typeof crypto === "object" && crypto != null) {
            cryptoLib = crypto
        } else if (typeof msCrypto === "object" && msCrypto != null) {
            cryptoLib = msCrypto
        }

        if (cryptoLib != null &&
                typeof cryptoLib.getRandomValues === "function") {
            // WHATWG crypto
            rnds = new Uint8Array(16)
            rng = function () {
                cryptoLib.getRandomValues(rnds)
            }
        } else {
            // Math.random()
            rnds = new Array(16)
            rng = function () {
                for (var i = 0, r; i < 16; i++) {
                    if (!(i & 3)) r = Math.random() * 0x100000000 >>> 0
                    rnds[i] = r >>> ((i & 3) << 3) & 0xff
                }
            }
        }
    }

    // The @rules that may contain other @rules are sorted before nesting to
    // limit it.
    var blockRules = {
        "@media": 0,
        "@supports": 0,
        "@document": 0,
        "@-moz-document": 0,
        "@page": 0,
    }

    // The conditional @rules.
    var conditionalRules = {
        "@media": 0,
        "@supports": 0,
        "@document": 0,
        "@-moz-document": 0,
    }

    var nameRe = "-?[-\\w\\x80-\\uffff]+"
    var stringRe = "(?:[^\r\n\f\\\\]|\\\\(?:\r\n?|[\"'\n\f]|" +
        "[0-9a-f]{1,6}(?:\r\n?|[\t\f\n])))*?"
    var localizeRe = new RegExp(
        // .class, #id
        "([\\.#]" + nameRe + ")|" +

        // :global(.class #id)
        ":global\\(((?:\\s*[\\.#]" + nameRe + "\\s*)+)\\)|" +

        // [attr=value], ['attr'="value"], etc.
        "\\[(?:" + nameRe + "|(['\"])" + stringRe + "\\3)(?:=(?:" +
            nameRe + "|(['\"])" + stringRe + "\\4))?\\]"
    , "gi")

    function getProperty(base, queries, sel) {
        var tree = base
        var keys = Object.keys(queries)
        var memo

        keys.sort(sortFn)
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i]
            var query = queries[key]

            if (!hasOwn.call(conditionalRules, key) || query !== "") {
                key += " " + query
                memo = tree[key]
                tree = memo != null ? memo : tree[key] = Object.create(null)
            }
        }

        memo = tree[sel]
        return memo != null ? memo : tree[sel] = Object.create(null)
    }

    function tryCall( // eslint-disable-line max-params
        opts, base,
        queries, sel, uniquify,
        name, row
    ) {
        if (Array.isArray(row[1])) {
            if (name[0] !== "@") {
                if (typeof opts.rule !== "function") return undefined
                return opts.rule(name, row[1])
            }

            if (typeof opts.atRule !== "function") return undefined
            return opts.atRule(name, row[1])
        }

        if (typeof opts.prop !== "function") return undefined

        var hit = false
        var prop

        for (var i = 1; i < row.length; i++) {
            var entry = opts.prop(name, row[i])

            if (entry != null) {
                hit = true
                walk(opts, base, queries, sel, uniquify, true, entry)
            } else {
                if (prop == null) {
                    prop = getProperty(base, queries, sel)
                    if (prop[name] == null) prop[name] = []
                }

                prop[name].push(row[i])
            }
        }

        return hit ? [] : undefined
    }

    function walkRow( // eslint-disable-line max-statements, max-params
        opts, base,
        queries, sel, uniquify,
        raw, row
    ) {
        var name = row[0]
        var prev

        if (typeof name === "function") {
            walk(opts, base, queries, sel, uniquify, raw,
                name.apply(undefined, row.slice(1)))
            return
        } else if (Array.isArray(name)) {
            // Just desugar it.
            for (var k = 0; k < name.length; k++) {
                row[0] = name[k]
                walkRow(opts, base, queries, sel, uniquify, raw, row)
            }
            return
        }

        // In case this somehow is ever the case.
        if (name == null || name === "") return

        name = (name + "").trim()
        var replacement = raw && opts != null
            ? tryCall(opts, base, queries, sel, uniquify, name, row)
            : undefined

        if (replacement != null) {
            if (replacement.length) {
                walk(opts, base, queries, sel, uniquify, true, replacement)
            }
        } else if (!Array.isArray(row[1])) {
            if (row.length === 0) return
            var prop = getProperty(base, queries, sel)
            var values

            if (row.length === 1) {
                if (!raw || (values = prop[""]) == null) {
                    prop[""] = [name]
                } else {
                    values.push(name)
                }
            } else if (!raw || (values = prop[name]) == null) {
                prop[name] = row.slice(1)
            } else {
                values.push.apply(values, row.slice(1))
            }
        } else if (name[0] !== "@") {
            var pre = ""

            if (name[0] === "&") {
                name = name.slice(1)
            } else if (sel !== "") {
                pre += " "
            }

            walk(
                opts, base, queries,
                sel + pre + name.replace(localizeRe, uniquify).trim(),
                uniquify, raw, row[1]
            )
        } else {
            var query = /^(@\w+)/.exec(name)[0]

            prev = queries[query]
            name = name.slice(query.length).trim()
            if (prev == null) prev = ""

            if (prev == null || prev === "") {
                queries[query] = name
            } else if (query === "@media" || query === "@supports") {
                queries[query] = prev + " and " + name
            } else {
                queries[query] = prev + ", " + name
            }

            walk(opts, base, queries, sel, uniquify, raw, row[1])
            queries[query] = prev
        }
    }

    function walk( // eslint-disable-line max-statements, max-params
        opts, base,
        queries, sel, uniquify,
        raw, list
    ) {
        for (var i = 0; i < list.length; i++) {
            walkRow(
                opts, base,
                queries, sel, uniquify,
                raw, list[i]
            )
        }
    }

    function emit(object) {
        var str = ""
        var hit = Object.create(null)
        var prop

        for (var query in object) {
            if (hasOwn.call(object, query) &&
                    /^@(media|supports|(-moz-)?document)\s+/.test(query)) {
                prop = object[query]

                if (Array.isArray(prop)) continue
                hit[query] = true
                str += query + "{" + emit(prop) + "}"
            }
        }

        for (var sel in object) {
            if (hasOwn.call(object, sel) && !hit[sel]) {
                prop = object[sel]

                if (!Array.isArray(prop)) {
                    if (sel !== "") str += sel + "{"
                    str += emit(prop)
                    if (sel !== "") str += "}"
                } else if (sel === "") {
                    str += prop.join(";") + ";"
                } else {
                    for (var i = 0; i < prop.length; i++) {
                        str += sel + ":" + prop[i] + ";"
                    }
                }
            }
        }

        return str
    }

    function sortFn(a, b) {
        if (hasOwn.call(blockRules, a)) {
            if (hasOwn.call(blockRules, b)) {
                return a.localeCompare(b)
            } else {
                return -1
            }
        } else if (hasOwn.call(blockRules, b)) {
            return 1
        } else {
            return a.localeCompare(b)
        }
    }

    return init()
    function init(opts) {
        // Avoid the slow path when no rule hooks are defined.
        if (opts != null && typeof opts.rule !== "function" &&
                typeof opts.atRule !== "function" &&
                typeof opts.prop !== "function") {
            opts = undefined
        }

        var base = Object.create(null)
        var parent = opts != null ? opts.parent : undefined
        var style

        if (parent != null && typeof parent.get === "function") {
            parent = parent.get(0)
        }

        return {
            init: init,

            add: function (styles) {
                var names = Object.create(null)

                function uniquify(raw, name, globals) {
                    if (name === "") return globals !== "" ? globals : raw
                    var type = name[0]

                    name = name.slice(1)
                    if (names[name] != null) return type + names[name]
                    // Generate a random, almost-RFC4122 UUID
                    rng()
                    return type + (
                        names[name] = name + "__" +
                            b2h[rnds[0]] + b2h[rnds[1]] +
                            b2h[rnds[2]] + b2h[rnds[3]] +
                            b2h[rnds[4]] + b2h[rnds[5]] +
                            b2h[rnds[6]] + b2h[rnds[7]] +
                            b2h[rnds[8]] + b2h[rnds[9]] +
                            b2h[rnds[10]] + b2h[rnds[11]] +
                            b2h[rnds[12]] + b2h[rnds[13]] +
                            b2h[rnds[14]] + b2h[rnds[15]]
                    )
                }

                walk(
                    opts, base,
                    Object.create(null), "", uniquify,
                    false, styles
                )
                return names
            },

            render: function () {
                return emit(base)
            },

            inject: function () {
                if (parent == null) parent = document.head
                if (style != null) {
                    style = document.createElement("style")
                    parent.appendChild(style)
                }
                style.textContent = emit(base)
            },

            detach: function () {
                if (style != null) {
                    parent.removeChild(style)
                    style = undefined
                }
            },
        }
    }
})
