// src/sudeCore.js
require('./utils/envLoader').loadEnv();
const { ClusterManager } = require('discord-hybrid-sharding');
const path = require('path');
const config = require('./config/config.json');

const parsedShards = Number(process.env.TOTAL_SHARDS);
const totalShards = isNaN(parsedShards) ? 'auto' : parsedShards;

const parsedClusters = Number(process.env.TOTAL_CLUSTERS);
const totalClusters = isNaN(parsedClusters) ? 'auto' : parsedClusters;

const shardsPerClusters = Number(process.env.SHARDS_PER_CLUSTER || 2);

const manager = new ClusterManager(
  path.join(__dirname, 'index.js'),
  {
    totalShards,
    shardsPerClusters,
    totalClusters,
    mode: 'process',
    token: process.env.TOKEN
  }
);

manager.on('clusterCreate', cluster => {
  console.log(`Cluster ${cluster.id} created`);
});

manager.spawn({ timeout: -1 });
