/**
 * Sellers
 */

const { v4: uuidv4 } = require('uuid');

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
        seller.id = uuidv4();

        return done();
    }
};
