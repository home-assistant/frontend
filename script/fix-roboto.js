var fs = require('fs');

var path = 'bower_components/paper-styles/typography.html';

var html = fs.readFileSync(path).toString();

var fixedHtml = html.replace('<link rel="import" href="../font-roboto/roboto.html">', '');

fs.writeFileSync(path, fixedHtml);
