import path from 'path';
import WebpackAutoInject from 'webpack-auto-inject-version';
import  CircularDependencyPlugin from 'circular-dependency-plugin';

export default {
  entry: path.join(__dirname, 'js/browser/main.js'),
  output: {
    path: path.join(__dirname, 'target'),
    filename: '[name].bundle.js',
  },
/*  module: {
    rules: [{
      test: /\.js/,
      exclude: /(node_modules|bower_components)/,
      use: [{
        loader: 'babel-loader',
      }],
    }],
  },*/
  stats: {
    colors: true,
  },
  mode: 'development',
  devtool: 'source-map',
  plugins: [new WebpackAutoInject(),  new CircularDependencyPlugin({exclude: /a\.js|node_modules/,failOnError: true,cwd: process.cwd()})],
};
