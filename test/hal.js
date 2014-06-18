var expect = require('chai').expect;
var _ = require('lodash');

var hal = require('..');

describe('HAL', function () {
  it('should expose Resource and Link classes', function () {
    expect(hal.Resource).to.be.a('function');
    expect(hal.Link).to.be.a('function');
  });

  describe('Link', function () {
    it('should require rel', function () {
      expect(function () { new hal.Link('', 'href'); }).to.throw(/"rel"/);
    });
    it('should require href', function () {
      expect(function () { new hal.Link('rel', ''); }).to.throw(/"href"/);
    });
    it('should accept a string as href', function () {
      var link = new hal.Link('rel', 'href');
      expect(link.rel).to.equal('rel');
      expect(link.href).to.equal('href');
    });
    it('should accept a hashmap of attributes', function () {
      var link = new hal.Link('rel', {href: 'href', name: 'name'});
      expect(link.href).to.equal('href');
      expect(link.name).to.equal('name');
    });
    it('should ignore extra attributes', function () {
      var link = new hal.Link('rel', {href: 'href', hello: 'world'});
      expect(link.href).to.equal('href');
      expect(link.hello).to.be.undefined;
    });
  });

  describe('Resource', function () {
    it('should copy attributes', function () {
      var res = new hal.Resource({hello: 'world', who: 'am I'});
      expect(res.hello).to.equal('world');
      expect(res.who).to.equal('am I');
    });
    it('should add link rel=self from given uri', function () {
      var res = new hal.Resource({}, 'href');
      expect(res._links).to.be.an('object');
      expect(res._links.self).to.be.an('object');
      expect(res._links.self.href).to.equal('href');
    });
    it('should accept attributes for link rel=self', function () {
      var res = new hal.Resource({}, {href: 'href', name: 'name'});
      expect(res._links).to.be.an('object');
      expect(res._links.self).to.be.an('object');
      expect(res._links.self.href).to.equal('href');
      expect(res._links.self.name).to.equal('name');
    });

    describe('link(rel, href)', function () {
      it('should add link', function () {
        var res = new hal.Resource({});
        var boundCall = res.link.bind(res, 'edit', '/edit');

        expect(boundCall).to.not.throw(Error);
        expect(res._links).to.have.property('edit');
        expect(res._links.edit.href).to.equal('/edit');
      });

      it('should add two links with same rel', function () {
        var res = new hal.Resource({});
        res.link('admin', '/user/john');
        res.link('admin', '/user/jane');

        expect(res._links).to.have.property('admin');
        expect(res._links.admin).to.be.an('Array');
        expect(_.pluck(res._links.admin, 'href')).to.deep.equal(['/user/john', '/user/jane']);
        expect(_.pluck(res._links.admin, 'rel')).to.deep.equal(['admin', 'admin']);
      });
    });

    describe('link(hal.Link)', function () {
      it('should add link', function () {
        var res = new hal.Resource({});
        var boundCall = res.link.bind(res, new hal.Link('edit', '/edit'));

        expect(boundCall).to.not.throw(Error);
        expect(res._links).to.have.property('edit');
        expect(res._links.edit.href).to.equal('/edit');
      });
    });

    describe('embed(rel, resource)', function () {
      it('should embed resource', function () {
        var res = new hal.Resource({}, 'href');
        var sub = new hal.Resource({}, 'href2');
        expect(res.embed.bind(res, 'subs', sub)).to.not.throw(Error);
        expect(res._embedded).to.have.property('subs');
        expect(res._embedded.subs).to.be.an('array');
        expect(res._embedded.subs).to.have.length(1);
      });
    });

    describe('String representation', function () {
      var resource;

      before(function () {
        resource = new hal.Resource({
          currentlyProcessing: 14,
          shippedToday: 20
        }, "/orders");
        resource.link("next", "/orders?page=2");
        resource.link("find", {href: "/orders{?id}", templated: true});

        var order123 = new hal.Resource({
          total: 30.00,
          currency: "USD",
          status: "shipped"
        }, "/orders/123");
        order123.link(new hal.Link("basket", "/baskets/98712"));
        order123.link(new hal.Link("customer", {href: "/customers/7809"}));

        var order124 = new hal.Resource({
          total: 20.00,
          currency: "USD",
          status: "processing"
        }, "/orders/124");
        order124.link("basket", "/baskets/97213");
        order124.link("customer", "/customers/12369");

        resource.embed("orders", [order123, order124]);
      });

      it('should export as JSON', function () {
        var json =
          // Links first
          '{"_links":{"self":{"href":"/orders"},"next":{"href":"/orders?page=2"},"find":{"href":"/orders{?id}","templated":true}},'
          // Embedded next
          + '"_embedded":{"orders":['
            // Sub resources
            + '{"_links":{"self":{"href":"/orders/123"},"basket":{"href":"/baskets/98712"},"customer":{"href":"/customers/7809"}},"total":30,"currency":"USD","status":"shipped"},'
            + '{"_links":{"self":{"href":"/orders/124"},"basket":{"href":"/baskets/97213"},"customer":{"href":"/customers/12369"}},"total":20,"currency":"USD","status":"processing"}'
          + ']}'
          // Properties finally
          + ',"currentlyProcessing":14,"shippedToday":20}';
        expect(resource.toJSON()).to.eql(JSON.parse(json));
        // Note: this test may fail as Object.keys() is not supposed to preserve order
        // We are theoricall unable to guess order of "_links" for example
        expect(JSON.stringify(resource)).to.eql(json);
      });

      it('should export as XML', function () {
        var xml = '<resource href="/orders">'
          // Links first
          + '<link rel="next" href="/orders?page=2" /><link rel="find" href="/orders{?id}" templated="true" />'
          // Embedded next
          + '<resource rel="order" href="/orders/123"><link rel="basket" href="/baskets/98712" /><link rel="customer" href="/customers/7809" /><total>30</total><currency>USD</currency><status>shipped</status></resource>'
          + '<resource rel="order" href="/orders/124"><link rel="basket" href="/baskets/97213" /><link rel="customer" href="/customers/12369" /><total>20</total><currency>USD</currency><status>processing</status></resource>'
          // Properties at end
          + '<currentlyProcessing>14</currentlyProcessing><shippedToday>20</shippedToday>'
          + '</resource>';
        expect(resource.toXML()).to.equal(xml);
      });
    });

    describe('toJSON', function () {
      it('does not include rel inside links', function () {
        var res = hal.Resource({}, '/self/href');

        expect(res.toJSON()._links).to.deep.equal({ self: { href: '/self/href' } });
      });

      it('works with several links with the same rel', function () {
        var res = hal.Resource({}, '/self/href');
        res.link('admin', '/user/john');
        res.link('admin', '/user/jane');
        res.link('admin', '/user/joe');

        expect(res.toJSON()._links).to.deep.equal({
          self: { href: '/self/href' },
          admin: [
            { href: '/user/john' },
            { href: '/user/jane' },
            { href: '/user/joe' }
          ]
        });
      });
    });

    describe('parsing from json', function () {
      it('parses _links as hal.Links', function () {
        var parsed = hal.Resource({
          _links: {
            self: { href: '/j1', rel: 'self' },
            mom: { href: '/m', rel: 'mom' },
            brother: [
              { href: '/j0', rel: 'brother' },
              { href: '/j2', rel: 'brother' },
              { href: '/j3', rel: 'brother' }
            ]
          }
        });

        expect(parsed._links.self.constructor).to.eql(hal.Link);
        expect(parsed._links.mom.constructor).to.eql(hal.Link);
        expect(parsed._links.brother).to.be.an('Array');
        expect(_.pluck(parsed._links.brother, 'constructor')).to.deep.equal([hal.Link, hal.Link, hal.Link]);
      });
    });

    describe('querying for links', function () {
      var resource;
      beforeEach(function () {
        resource = hal.Resource({
          _links: {
            self: { href: '/me' },
            pop: { href: '/pop' },
            sister: [
              { href: '/one' },
              { href: '/two' }
            ]
          }
        });
      });

      it ('return an array with all links', function () {
        var links = resource.links();
        expect(links).to.be.an('Array');
        expect(_.pluck(links, 'rel')).to.deep.equal(['self', 'pop', 'sister', 'sister']);
        expect(_.pluck(links, 'href')).to.deep.equal(['/me', '/pop', '/one', '/two']);
      });

      it('return only the links with the given rel', function () {
        var links = resource.links('sister');
        expect(links).to.be.an('Array');
        expect(_.pluck(links, 'rel')).to.deep.equal(['sister', 'sister']);
        expect(_.pluck(links, 'href')).to.deep.equal(['/one', '/two']);
      });

      it('return an array of links with the given rel even if there is only one', function () {
        var links = resource.links('pop');
        expect(links).to.be.an('Array');
        expect(_.pluck(links, 'rel')).to.deep.equal(['pop']);
        expect(_.pluck(links, 'href')).to.deep.equal(['/pop']);
      });

      it('return an empty array if there is no link with given rel', function () {
        var links = resource.links('mom');
        expect(links).to.deep.equal([]);
      });

      describe('link(rel)', function () {
        it('should return the link with that relation', function () {
          var link = resource.link('pop');
          expect(link.rel).to.equal('pop');
          expect(hal.Link.toJSON(link)).to.deep.equal({ href: '/pop' });
        });
      });
    });
  });
});
