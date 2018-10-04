const path = require('path');

module.exports = {
  entry: './js/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets:
           [[
             "@babel/preset-env",
             {
               "targets":
              {
                "chrome": 52,
                "browsers": ["Firefox 49", "Edge 12","Chrome 53", "Opera 41", "Safari 10"],
              },
               "useBuiltIns": "usage",
             },
           ]],

        },
      },
    ],
  },
  stats: {
    colors: true,
  },
  devtool: 'source-map',
};
