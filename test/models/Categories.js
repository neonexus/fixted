/**
 * Categories
 */

module.exports = {
    attributes: {
        id: {
            type: 'number',
            autoIncrement: true
        },
        name: {
            type: 'string'
        },
        products: {
            collection: 'products',
            via: 'category'
        }
    }
};
