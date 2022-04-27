/**
 * Products
 */

const { v4: uuidv4 } = require('uuid');

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
        product.customId = uuidv4();

        return done();
    }
};
