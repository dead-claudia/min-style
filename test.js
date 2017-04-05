/* eslint strict: [2, "global"] */
/* eslint-env node */
"use strict"

var t = require("thallium")
var assert = require("thallium/assert")
var minStyle = require("./min-style")

t.test("min-style", function () {
    t.test("empty style", function () {
        var css = minStyle.init()

        css.add([])
        assert.match(css.render(), "")
    })

    t.test("top-level string", function () {
        var css = minStyle.init()

        css.add([
            ["some string"],
        ])
        assert.match(css.render(), "some string;")
    })

    t.test("top-level at-rule string", function () {
        var css = minStyle.init()

        css.add([
            ["@charset 'utf-8'"],
        ])
        assert.match(css.render(), "@charset 'utf-8';")
    })

    t.test("top-level property", function () {
        var css = minStyle.init()

        css.add([
            ["key", "value"],
        ])
        assert.match(css.render(), "key:value;")
    })

    t.test("top-level selector", function () {
        var css = minStyle.init()
        var styles = css.add([
            [".foo #bar baz", [
                ["key", "value"],
            ]],
        ])

        assert.match(css.render(), [
            "." + styles.foo + " #" + styles.bar + " baz{",
            "key:value;",
            "}",
        ].join(""))
    })

    t.test("top-level at-rule", function () {
        var css = minStyle.init()

        css.add([
            ["@foo", [
                ["key", "value"],
            ]],
        ])

        assert.match(css.render(), "@foo {key:value;}")
    })

    t.test("nested selectors + mixins", function () {
        var css = minStyle.init()

        function stripe(even, odd) {
            even = even || "#fff"
            odd = odd || "#eee"
            return [
                ["tr", [
                    ["background-color", odd],
                    [["&.even", "&:nth-child(even)"], [
                        ["background-color", even],
                    ]],
                ]],
            ]
        }

        var styles = css.add([
            ["table", [
                [stripe],
                ["td", [
                    ["padding", "4px 10px"],
                ]],
            ]],

            ["table#users", [
                [stripe, "#303030", "#494848"],
                ["td", [
                    ["color", "white"],
                ]],
            ]],
        ])

        assert.match(css.render(), [
            "table tr{background-color:#eee;}",
            "table tr." + styles.even + "{background-color:#fff;}",
            "table tr:nth-child(even){background-color:#fff;}",
            "table td{padding:4px 10px;}",
            "table#" + styles.users + " tr{background-color:#494848;}",
            "table#" + styles.users + " tr." + styles.even +
                "{background-color:#303030;}",
            "table#" + styles.users +
                " tr:nth-child(even){background-color:#303030;}",
            "table#" + styles.users + " td{color:white;}",
        ].join(""))
    })

    t.test("nested @media + mixins", function () {
        var css = minStyle.init()

        function stripe(even, odd) {
            even = even || "#fff"
            odd = odd || "#eee"
            return [
                ["tr", [
                    ["background-color", odd],
                    [["&.even", "&:nth-child(even)"], [
                        ["background-color", even],
                    ]],
                    ["@media (min-width: 400px)", [
                        ["background-color", "#eee"],
                        [["&.even", "&:nth-child(even)"], [
                            ["background-color", "#fff"],
                        ]],
                    ]],
                ]],
            ]
        }

        var styles = css.add([
            ["table", [
                [stripe],
                ["td", [
                    ["padding", "4px 10px"],
                ]],
            ]],

            ["table#users", [
                ["@media (max-width: 1000px)", [
                    [stripe, "#303030", "#494848"],
                    ["td", [
                        ["color", "white"],
                    ]],
                ]],
            ]],
        ])

        assert.match(css.render(), [
            "@media (min-width: 400px){",
            "table tr{background-color:#eee;}",
            "table tr." + styles.even + "{background-color:#fff;}",
            "table tr:nth-child(even){background-color:#fff;}",
            "}",

            "@media (max-width: 1000px){",
            "table#" + styles.users + " tr{background-color:#494848;}",
            "table#" + styles.users + " tr." + styles.even +
                "{background-color:#303030;}",
            "table#" + styles.users +
                " tr:nth-child(even){background-color:#303030;}",
            "table#" + styles.users + " td{color:white;}",
            "}",

            "@media (max-width: 1000px) and (min-width: 400px){",
            "table#" + styles.users + " tr{background-color:#eee;}",
            "table#" + styles.users + " tr." + styles.even +
                "{background-color:#fff;}",
            "table#" + styles.users +
                " tr:nth-child(even){background-color:#fff;}",
            "}",

            "table tr{background-color:#eee;}",
            "table tr." + styles.even + "{background-color:#fff;}",
            "table tr:nth-child(even){background-color:#fff;}",
            "table td{padding:4px 10px;}",
        ].join(""))
    })
})
