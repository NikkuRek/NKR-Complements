const swaggerJsdoc = require('swagger-jsdoc');
const YAML = require('yamljs');
const fs = require('fs');
const path = require('path');

// Load main swagger config
const mainSpec = YAML.load(path.join(__dirname, 'doc', 'swagger.yaml'));

// Load all endpoint definitions
const accountsSpec = YAML.load(path.join(__dirname, 'doc', 'accounts.yaml'));
const bucketsSpec = YAML.load(path.join(__dirname, 'doc', 'buckets.yaml'));
const transactionsSpec = YAML.load(path.join(__dirname, 'doc', 'transactions.yaml'));
const wishlistSpec = YAML.load(path.join(__dirname, 'doc', 'wishlist.yaml'));
const utilsSpec = YAML.load(path.join(__dirname, 'doc', 'utils.yaml'));

// Merge all paths into main spec
mainSpec.paths = {
    ...accountsSpec,
    ...bucketsSpec,
    ...transactionsSpec,
    ...wishlistSpec,
    ...utilsSpec
};

module.exports = mainSpec;
