/**
 * Tags
 */

module.exports = {
    attributes: {
        id: {
            type: 'number',
            autoIncrement: true
        },
        products: {
            collection: 'products',
            via: 'tags'
        }
    }
};
