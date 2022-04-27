'use strict';

/**
 * Dependencies
 */
const should = require('chai').should();
const Sails = require('sails');
const Fixted = require('../');
const fixted = new Fixted();

describe('Fixted', function() {
    const fixtures = fixted.data;

    // Load fixtures into memory
    describe('constructor', function() {
        it('should load all the json files from default folder', function(done) {
            Object.keys(fixtures).length.should.equal(
                6,
                'Expected 6 total fixture files'
            );

            done();
        });

        it('should set generate lowercase property names for models', function(done) {
            const oneWord = Object.keys(fixtures).join();
            oneWord.toLowerCase().should.be.eql(
                oneWord,
                'Property names should be in lowercase!'
            );

            done();
        });
    });

    // Populate DB with fixtures
    describe('populate()', function() {
        before(function(done) {
            Sails.lift({
                paths: {
                    models: require('path').join(
                        process.cwd(),
                        'test/models'
                    )
                },
                datastores: {
                    default: {
                        adapter: 'sails-disk',
                        inMemoryOnly: true
                    }
                },
                models: {
                    migrate: 'alter' // the inMemoryOnly will drop for us
                },
                hooks: {
                    grunt: false
                },
                globals: {
                    sails: true,
                    _: require('lodash'),
                    async: require('async'),
                    models: true
                },
                log: {
                    level: 'warn'
                }
            }, function(err, sails) {
                done(err, sails);
            });
        });

        after(function(done) {
            Sails.lower(done);
        });

        describe('populate(cb)', function() {
            before(function(done) {
                // Sellers should get changed to 'sellers' internally
                fixted.populate(['Sellers', 'regions'], function(err) {
                    if (err) {
                        return done(err);
                    }

                    fixted.populate(['categories', 'products', 'tags'], function(err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
                });
            });

            it('should populate the DB with products and categories', function(done) {
                Categories.find().exec(function(err, categories) {
                    if (err) {
                        return done(err);
                    }

                    const gotCategories = (fixtures['categories'].length > 0);
                    const categoriesAreInTheDb = (categories.length === fixtures['categories'].length);

                    gotCategories.should.be.true;
                    categoriesAreInTheDb.should.be.true;

                    Products.find().exec(function(err, products) {
                        if (err) {
                            return done(err);
                        }

                        categories.length.should.be.eql(products.length, 'Categories and products should have equal amount of entries!');

                        done();
                    });
                });
            });

            it('should assign a category to each product', function(done) {
                Products.find().populate('category').exec(function(err, products) {
                    if (err) {
                        return done(err);
                    }

                    async.each(products, function(product, nextProduct) {
                        product.category.name.should.not.be.empty;

                        nextProduct();
                    }, done);
                });
            });

            it('should assign at least two tags to each product', function(done) {
                Products.find().populate('tags').exec(function(err, products) {
                    if (err) {
                        return done(err);
                    }

                    async.each(products, function(product, nextProduct) {
                        product.tags.length.should.be.greaterThan(1);

                        nextProduct();
                    }, done);
                });
            });

            it('should assign at least two regions to each product', function(done) {
                Products.find().populate('regions').exec(function(err, products) {
                    if (err) {
                        return done(err);
                    }

                    async.each(products, function(product, nextProduct) {
                        product.regions.length.should.be.greaterThan(1);

                        nextProduct();
                    }, done);
                });
            });
        });

        describe('populate(cb, false)', function() {
            before(function(done) {
                fixted.populate(['sellers', 'regions'], function(err) {
                    if (err) {
                        return done(err);
                    }

                    fixted.populate(['categories', 'products', 'tags'], function(err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    }, false);
                }, false);
            });

            it('should keep the associations-related fields', function(done) {
                Products.find().populate('tags').exec(function(err, products) {
                    if (err) {
                        return done(err);
                    }

                    async.each(products, function(product, nextProduct) {
                        product.category.should.be.a('number');
                        product.tags.should.be.an('array');

                        nextProduct();
                    }, done);
                });
            });
        });

        describe('populate(modelList, cb)', function() {
            before(function(done) {
                Products.destroy({}).exec(function(err) {
                    if (err) {
                        return done(err);
                    }

                    Categories.destroy({}).exec(function(err) {
                        if (err) {
                            return done(err);
                        }

                        fixted.populate(['sellers', 'regions'], function(err) {
                            if (err) {
                                return done(err);
                            }

                            fixted.populate(['products', 'tags'], function(err) {
                                if (err) {
                                    return done(err);
                                }

                                done();
                            });
                        });
                    });
                });
            });

            it('should populate products but not categories', function(done) {
                Products.find().exec(function(err, products) {
                    if (err) {
                        return done(err);
                    }

                    products.length.should.be.greaterThan(1);
                });

                Categories.find().exec(function(err, categories) {
                    if (err) {
                        return done(err);
                    }

                    categories.length.should.be.eql(0);
                });

                done();
            });
        });
    });
});
