var express = require('express');
var URL = require('url');
var mongo = require('mongodb').MongoClient;
var fs = require('fs');
var app = express();

app.get('/', function(req, res) {
    res.writeHead(200, {
        'content-type': 'text/html'
    });
    var fileStream = fs.createReadStream('./public/index.html');
    fileStream.pipe(res);
});

app.get('/:number', function(req, res) {
    mongo.connect('mongodb://localhost:27017/url-shortener', function(err, db) { 
        if(err) {
            res.send({"error": err});
            res.end();
        } else {
            var urls = db.collection('urls');
            urls.findOne({number:parseInt(req.params.number)}, function(err, data) {
                if(err || !data) {
                    res.send({"error": err});
                    res.end();
                } else {
                    res.writeHead(301,
                      {Location: data.original_url}
                    );
                    res.end();
                }
            });
        }
    });
    
});

app.get('/new/*', function(req, res) {
    var url = URL.parse(req.params[0]);
    if (!url.host) {
        res.send({
            "error": "Not a valid URL"
        });
        return;
    }
    mongo.connect('mongodb://localhost:27017/url-shortener', function(err, db) {
        if (!err) {
            var urls = db.collection('urls');
            urls.ensureIndex({
                "number": 1
            }, {
                unique: true
            })
            var data = urls.findOne({
                original_url: url.href
            }, {
                _id: 0,
                number: 0
            }, function(err, data) {
                if (err)
                    res.send({
                        "error": "Not a valid URL"
                    });
                if (data) {
                    res.send(JSON.stringify(data));
                }
                else {
                    var newData = db.collection('urls');
                    newData.findOne({
                        $query: {
                            number: 1
                        },
                        $orderby: {
                            number: -1
                        }
                    }, function(err, data) {
                        var number = 1;
                        if (!err && data) {
                            number = data.number+1;
                        }
                        var short = req.protocol + '://' + req.headers.host + '/' + number;
                        newData.insert({
                            original_url: url.href,
                            number: number,
                            short_url: short
                        }, function(err, doc) {
                            if (!err) {
                                res.send(JSON.stringify({
                                    original_url: url.href,
                                    short_url: short
                                }));
                            }
                            else {
                                res.send({
                                    "error": err
                                });
                            }
                        });
                    });

                }
            });
        }
    });
});

app.listen(8080, function() {
    console.log('URL Shortener Server listening on port 8080!');
});
