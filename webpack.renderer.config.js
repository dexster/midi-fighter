const rules = require('./webpack.rules');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');



rules.push(
  { test: /\.(html)$/, use: ["html-loader"] },
  {
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
  },
  // {
  //   test: /\.(png|jpg|svg|jpeg|gif)$/i,
  //   use: [
  //     {
  //       loader: 'url-loader'
  //     }],
  // }
);

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{
        from: path.resolve(__dirname, 'src', 'data'),
        to: path.resolve(__dirname, '.webpack/renderer', 'data')
    }],
    }),
  ],
};
