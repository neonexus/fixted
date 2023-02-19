/**
 * Sellers
 */

const crypto = require('crypto');

module.exports = {
    attributes: {
        id: {
            type: 'string'
        },
        name: {
            type: 'string',
            required: true
        }
    },

    beforeCreate: function(seller, done) {
        seller.id = crypto.randomUUID();

        return done();
    }
};
