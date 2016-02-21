var webpack = require("webpack");

module.exports = {
  entry: "./src/index.js",
  output: {
    path: "./build",
    publicPath: "/",
    filename: "app.js"
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: "babel",
        exclude: /(node_modules|bower_components)/,
        query: {
          presets: ['react', 'es2015']
        }
      },
      {
        test: /\.json$/,
        loader: "json",
        exclude: /(node_modules|bower_components)/
      },
      {
        test: /\.less/,
        loader: 'style!css!less'
      }
    ]
  },
  resolve: {
    extensions: ["", ".js", ".less"]
  },
  plugins: [
  ],
  devServer: {
    contentBase: "build",
    progress: true,
    inline: true,
    historyApiFallback: true,
    quiet: false,
    noInfo: false,
    host: "0.0.0.0",
    port: 4000
  }
};
