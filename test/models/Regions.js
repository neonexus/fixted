/**
 * Region
 */

module.exports = {
    attributes: {
        id: {
            type: 'number',
            autoIncrement: true
        },
        products: {
            collection: 'products',
            via: 'regions'
        },
        name: {
            type: 'string'
        }
    }
};
