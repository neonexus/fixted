/**
 * Products
 */

const crypto = require('crypto');

module.exports = {
    primaryKey: 'customId',

    attributes: {
        customId: {
            type: 'string'
        },
        name: {
            type: 'string',
            required: true
        },
        category: {
            model: 'categories'
        },
        tags: {
            collection: 'tags',
            via: 'products',
            dominant: true
        },
        seller: {
            model: 'sellers',
            required: true
        },
        regions: {
            collection: 'regions',
            via: 'products'
        }
    },

    beforeCreate: function(product, done) {
        product.customId = crypto.randomUUID();

        return done();
    }
};
