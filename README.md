# min-style

A simple, small (~1.7k min+gzip), sweet CSS-in-JS solution, that happens to be fully isomorphic and runtime-independent (except for CSS injection), falling back to and implemented in pure ES5. It is also compatible with jQuery, Zepto, and many other similar libraries (detected by a `.get()` method).

## Installation

You can install this from npm:

```
npm install --save @isiahmeadows/min-style
```

You can also use `min-style.js` or `min-style.min.js` from here directly.

*(Yes, it's a [scoped package](https://docs.npmjs.com/getting-started/scoped-packages). Don't worry, it's correct, and you can use it like any other npm module.)*

## Usage

It's exposed as a UMD module, presenting both CommonJS and AMD variants, as well as a global version for `<script>` inclusion, which exposes itself as `minStyle`.

```js
// Node.js/Webpack/etc.
const minStyle = require("@isiahmeadows/min-style")

// RequireJS
define(["min-style"], function (minStyle) {
    // ...
})
```

And for an example stylesheet, totally ~~not~~ ripped from Stylus's examples:

```js
function stripe(even = "#fff", odd = "#eee") {
    return [
        ["tr", [
            ["background-color", odd],
            [["&.even", "&:nth-child(even)"], [
                ["background-color", even]
            ]]
        ]]
    ]
}

const styles = minStyle.add([
    ["table", [
        [stripe],
        ["td", [
            ["padding", "4px 10px"],
        ]]
    ]],

    ["table#users", [
        [stripe, "#303030", "#494848"],
        ["td", [
            ["color", "white"]
        ]]
    ]]
])

minStyle.inject() // whenever you're ready
```

## API

```js
[".selector", [
    // ...
    [".nested :global(.btn.btn-warning)", [
        // ...
    ]]
]]
```

Add a CSS selector rule. These may be nested, and they accept media and font-face queries at any point, and an object is returned containing key-value pairs for the detected classes and IDs to their generated equivalents.

Notes:

- Classes are local by default. Wrap a group of class/ID selectors in `:global(.foo.bar)` to break from this.
- The generated class names have the following format: `{name}__{16 random digits}`
- You may also pass an array of selectors, in which the block is run once for each selector.
- In older ES5 engines that don't iterate objects in insertion order, the selectors may be rendered out of order.

```js
["color", "red"]
["border-color", "blue"]
["background-color", "green", "linear-gradient(...)"]
```

Set CSS properties. Add more than one value to add fallbacks.

```js
const styles = minStyle.add([
    [".selector", [
        // ...
    ]]

    // ...
])
```

Create a combined CSS fragment. It returns a mapping of all non-global classes detected to their uniquified variants.

```js
[mixin, ...opts]
```

Apply a mixin with various opts. A mixin is simply a function accepting the passed options proxied through and returning an array of 0 or more selectors, properties, mixin calls, etc.

```js
const css = minStyle.render()
```

Render the CSS to a string, for whatever your needs are.

```js
const detach = minStyle.inject(parent=document.head)

// ...
detach()
```

Inject the CSS into the DOM, optionally into a parent. Call `detach` to detach the previously injected CSS.

```js
const factory = minStyle.init({...opts})
```

Create a new instance of this library, potentially with various options set. Here's the following options accepted:

- `opts.parent` - The parent element or jQuery instance to append the style element to, defaulting lazily to `document.head`.
- `opts.prop(key, value)` - Called on each property, before emitting. Return an object or array of objects to change this.
- `opts.atRule(key, rule)` - Called on each at-rule, before emitting. Return an object or array of objects to change this.
- `opts.rule(key, rule)` - Called on each rule, before emitting. Return an object or array of objects to change this.

## License

The following license (ISC License), unless otherwise stated:

Copyright (c) 2016 and later, Isiah Meadows <me@isiahmeadows.com>.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
