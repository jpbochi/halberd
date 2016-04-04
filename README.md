# Halberd [![Build Status](https://travis-ci.org/jpbochi/halberd.png?branch=halberd)](https://travis-ci.org/jpbochi/halberd)

[HAL](http://stateless.co/hal_specification.html) is a hypermedia-aware serialization format, which can be represented using JSON and XML format. You can find more details about HAL in [specification draft](http://tools.ietf.org/html/draft-kelly-json-hal-07).

It's obviously particularly useful for RESTful API delivering real Hypermedia contents (cf HATEOAS).

## Differences from [naholyr/js-hal](https://github.com/naholyr/js-hal)

* It's meant to also be used on the client side. In other words, it accepts a full hal+json (with links) on the `hal.Resource` constructor.
* Support for requirejs/AMD.
* [planned] Accept embedded resources on the `hal.Resource` constructor.

## Usage

### In your browser

```html
<script src="/path/to/halberd.js"></script>
<script>
var resource = new Halberd.Resource({name: "Harry"}, '/harry');
resource.link('hello', '/harry/hello');
console.log(resource.toJSON());
</script>
```

#### Compatibility

Don't know, didn't test. It may not even work on the browser, who knows ?

OK, more seriously you'll require:
* `JSON.stringify`
* `Array.prototype.forEach`
* `Array.prototype.reduce`
* `Object.prototype.hasOwnProperty`

### In Node.JS

[halberd NPM package](https://npmjs.org/package/halberd)

```sh
npm install halberd
```

```javascript
var hal = require('halberd');

var resource = new hal.Resource({name: "Harry"}, '/harry');
resource.link('hello', '/harry/hello');
console.log(resource.toJSON());
```

## API

### `Resource(object, uri)`

This class designs a HAL resource:

* `object` are the base fields of this resource
 * Note that you can define `_links` and `_embedded` properties, this is at your own risks
 * If you set `href` property and `uri` is undefined, it will be used instead of `uri` and deleted
* `uri` is the link to this property (as `<link rel="self">`)

### `Link(rel, href)` or `Link(rel, attributes)`

This class designs a HAL link:

* `rel` is mandatory
* `href` or `attributes.href` is mandatory

### `Resource#link(link)` or `Resource#link(rel, href)` or `Resource#link(rel, attributes)`

Adds a new link to resource.

### `Resource#embed(rel, resource[s])`

Embeds other resource(s) to current resource.

### `Resource#links()`

Returns all links of a resource.

### `Resource#links(rel)` or `Resource#links(relsArray)`

Returns links of a given relation (or relations) of a resource.

### `Resource#link(rel)`

Returns the first link of a given relation of a resource, or null if there is no such link.

### `Resource#toXML()`

Returns XML representation.

Note: embedded resources `rel` will be naively singularized by removing last 's'. See `Resource#toJSON` for more information.

### `Resource#toJSON()`

Returns JSON representation.

Note: `rel` will be naively pluralized by appending a 's' if there is not. This is due to differences between JSON and XML representation on embedded relationship and `rel` attribute.

## Example

```javascript
// A resource
var ordersCollection = new hal.Resource({
  currentlyProcessing: 14,
  shippedToday: 20
}, "/orders");

// Links
ordersCollection.link("next", "/orders?page=2");
ordersCollection.link("find", {href: "/orders{?id}", templated: true});

// Another resource
var order123 = new hal.Resource({
  total: 30.00,
  currency: "USD",
  status: "shipped"
}, "/orders/123");
// Alternative ways to link
order123.link(new hal.Link("basket", "/baskets/98712"));
order123.link(new hal.Link("customer", {href: "/customers/7809"}));

// Yet another resource
var order124 = new hal.Resource({
  total: 20.00,
  currency: "USD",
  status: "processing"
}, "/orders/124");
order124.link("basket", "/baskets/97213");
order124.link("customer", "/customers/12369");

// Embed the resources
ordersCollection.embed("orders", [order123, order124]);
```

Calling `ordersCollection.toJSON('  ')`:

```javascript
{
  "currentlyProcessing": 14,
  "shippedToday": 20,
  "_links": {
    "self": {
      "href": "/orders"
    },
    "next": {
      "href": "/orders?page=2"
    },
    "find": {
      "href": "/orders{?id}",
      "templated": "true"
    }
  },
  "_embedded": {
    "orders": [
      {
        "total": 30,
        "currency": "USD",
        "status": "shipped",
        "_links": {
          "self": {
            "href": "/orders/123"
          },
          "basket": {
            "href": "/baskets/98712"
          },
          "customer": {
            "href": "/customers/7809"
          }
        }
      },
      {
        "total": 20,
        "currency": "USD",
        "status": "processing",
        "_links": {
          "self": {
            "href": "/orders/124"
          },
          "basket": {
            "href": "/baskets/97213"
          },
          "customer": {
            "href": "/customers/12369"
          }
        }
      }
    ]
  }
}
```

Calling `ordersCollection.toXML('  ')`:

```xml
<resource href="/orders">
  <link rel="next" href="/orders?page=2" />
  <link rel="find" href="/orders{?id}" templated="true" />
  <currentlyProcessing>14</currentlyProcessing>
  <shippedToday>20</shippedToday>
  <resource rel="order" href="/orders/123">
      <link rel="basket" href="/baskets/98712" />
      <link rel="customer" href="/customers/7809" />
      <total>30</total>
      <currency>USD</currency>
      <status>shipped</status>
  </resource>
  <resource rel="order" href="/orders/124">
      <link rel="basket" href="/baskets/97213" />
      <link rel="customer" href="/customers/12369" />
      <total>20</total>
      <currency>USD</currency>
      <status>processing</status>
  </resource>
</resource>
```

Yes, JSON seems a lot more verbose, but it's because of the spaces. In production you won't add indentation and then JSON is 517 bytes long, versus 625 bytes of XML.

Not yet, XML, not yet.
