/*jslint node: true */
'use strict';

/**
 * Fixted: Simple fixtures for Sails.js
 */

/**
 * Dependencies
 */
const fs = require('fs');
const path = require('path');
const async = require('async');
const _ = require('lodash');

module.exports = Fixted;

/**
 * Fixted module
 * @param {string?} sourceFolder - Defaults to <project root>/test/fixtures
 */
function Fixted(sourceFolder) {
    if (!(this instanceof Fixted)) {
        return new Fixted(sourceFolder);
    }

    // Fixture objects loaded from the JSON files
    this.data = {};

    // Map fixture positions in JSON files to the real DB IDs
    this.idMap = {};

    // The list of associations by model
    this.associations = {};

    // Load the fixtures
    sourceFolder = sourceFolder || process.cwd() + '/test/fixtures';
    const files = fs.readdirSync(sourceFolder);

    for (let i = 0; i < files.length; i++) {
        if (['.json', '.js'].indexOf(path.extname(files[i]).toLowerCase()) !== -1) {
            const modelName = path.basename(files[i]).split('.')[0].toLowerCase();

            this.data[modelName] = require(path.join(sourceFolder, files[i]));
        }
    }

    // The list of the fixtures model names
    this.modelNames = Object.keys(this.data);
}

/**
 * Add Associations
 * @param {[]|function} collections - Array of models, or callback
 * @param {function} [done] - Callback
 */
Fixted.prototype.associate = function(collections, done) {
    const that = this;

    if (!_.isArray(collections)) {
        done = collections;
        collections = this.modelNames;
    }

    // Add associations whenever needed
    async.each(collections, function(modelName, nextModel) {
        const Model = sails.models[modelName];

        if (Model) {
            const fixtureObjects = _.cloneDeep(that.data[modelName]);

            async.each(fixtureObjects, function(item, nextItem) {
                // Item position in the file
                const itemIndex = fixtureObjects.indexOf(item);

                // Find and associate
                Model.findOne(that.idMap[modelName][itemIndex]).exec(function(err, model) {
                    if (err) {
                        return nextItem(err);
                    }

                    if (!model) {
                        return nextItem(new Error('Could not find the model'));
                    }

                    // Pick associations only
                    item = _.pick(item, Object.keys(that.associations[modelName]));

                    _.forEach(item, function(val, attr) {
                        const association = that.associations[modelName][attr];
                        const joined = association[association.type];

                        // Required associations should have been added by .populate()
                        if (association.required) {
                            return;
                        }

                        if (!_.isArray(item[attr])) {
                            model[attr] = that.idMap[joined][item[attr] - 1];
                        } else {
                            model[attr] = [];

                            for (let j = 0; j < item[attr].length; ++j) {
                                model[attr].push(that.idMap[joined][item[attr][j] - 1]);
                            }
                        }
                    });

                    Model.updateOne(that.idMap[modelName][itemIndex]).set(model).exec(function(err) {
                        if (err) {
                            return nextItem(err);
                        }

                        return nextItem();
                    });
                });
            }, nextModel);
        } else {
            nextModel();
        }
    }, done);
};

/**
 * Put loaded fixtures in the database, associations excluded
 * @param {[]} collections - Optional list of collections to populate
 * @param {function} done - Callback
 * @param {boolean} autoAssociations - Automatically associate based on the order in the fixture files
 */
Fixted.prototype.populate = function(collections, done, autoAssociations) {
    let preserveLoadOrder = true;
    const that = this;

    if (!_.isArray(collections)) {
        autoAssociations = done;
        done = collections;
        collections = this.modelNames;
        preserveLoadOrder = false;
    } else {
        _.each(collections, function(collection, key) {
            collections[key] = collection.toLowerCase();
        });
    }

    autoAssociations = !(autoAssociations === false);

    // Populate each table / collection
    async[preserveLoadOrder ? 'eachSeries' : 'each'](collections, function(modelName, nextModel) {
        let Model = sails.models[modelName];

        if (Model) {
            // Cleanup existing data in the table / collection
            Model.destroy({}).exec(function(err) {
                if (err) {
                    return nextModel(err);
                }

                // Save model's association information
                that.associations[modelName] = {};
                for (let i = 0; i < Model.associations.length; ++i) {
                    const alias = Model.associations[i].alias;

                    that.associations[modelName][alias] = Model.associations[i];
                    that.associations[modelName][alias].required = Model.attributes[alias].required;
                }

                // Insert all the fixture items
                that.idMap[modelName] = [];
                const fixtureObjects = _.cloneDeep(that.data[modelName]);

                async.eachSeries(fixtureObjects, function(item, nextItem) {
                    // Item position in the file
                    const itemIndex = fixtureObjects.indexOf(item);

                    for (const alias in that.associations[modelName]) {
                        if (that.associations[modelName].hasOwnProperty(alias)) {
                            if (that.associations[modelName][alias].required) {
                                // With required associations present, the associated fixtures
                                // must be already loaded, so we can map the ids
                                const collectionName = that.associations[modelName][alias].collection; // many-to-many
                                const associatedModelName = that.associations[modelName][alias].model; // one-to-many

                                if (_.isArray(item[alias]) && collectionName) {
                                    if (!that.idMap[collectionName]) {
                                        return nextItem(
                                            new Error('Please provide a loading order acceptable for required associations')
                                        );
                                    }

                                    for (let i = 0; i < item[alias].length; i++) {
                                        item[alias][i] = that.idMap[collectionName][item[alias][i] - 1];
                                    }
                                } else if (associatedModelName) {
                                    if (!that.idMap[associatedModelName]) {
                                        return nextItem(
                                            new Error('Please provide a loading order acceptable for required associations')
                                        );
                                    }

                                    item[alias] = that.idMap[associatedModelName][item[alias] - 1];
                                }
                            } else if (autoAssociations) {
                                // The order is not important, so we can strip
                                // associations data and associate later
                                item = _.omit(item, alias);
                            }
                        }
                    }

                    // Insert
                    Model.create(item).meta({fetch: true}).exec(function(err, model) {
                        if (err) {
                            return nextItem(err);
                        }

                        // Primary key mapping
                        that.idMap[modelName][itemIndex] = model[Model.primaryKey];

                        nextItem();
                    });
                }, nextModel);
            });
        } else {
            nextModel();
        }
    }, function(err) {
        if (err) {
            return done(err);
        }

        // Create associations if requested
        if (autoAssociations) {
            return that.associate(collections, done);
        }

        done();
    });
};
