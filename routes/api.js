/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

'use strict';
require('dotenv').config();
var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

const CONNECTION_STRING = process.env.DB;

module.exports = function(app) {
  app.route('/api/issues/:project')
    .get(function(req, res, next) {
      var project = req.params.project;
      var getQuery = {
        project: project
      };
      for (let key in req.query) {
        if (key === "open") {
          getQuery[key] = JSON.parse(req.query[key]);
        } else if (key === "created_on" || key === "updated_on") {
          let date = new Date(req.query[key]);
          let nextDate = new Date(req.query[key]);
          nextDate.setDate(date.getDate() + 1);
          getQuery[key] = {
            "$gte": date,
            "$lt": nextDate
          };
        } else {
          getQuery[key] = req.query[key];
        }
      }
      MongoClient.connect(CONNECTION_STRING, function(err, db) {
        if (err) return next(err)
        db.collection("issuetracking")
          .find(getQuery)
          .toArray((err, issues) => {
            if (err) return next(err);
            res.send(issues)
          })

      })
    })

    .post(function(req, res, next) {
      var project = req.params.project;
      const data = {
        _id: new ObjectID,
        issue_title: req.body.issue_title,
        issue_text: req.body.issue_text,
        created_on: new Date(),
        updated_on: null,
        created_by: req.body.created_by,
        assigned_to: req.body.assigned_to,
        open: true,
        status_text: req.body.status_text,
        project: project
      };
      if (data.issue_title === '' || data.issue_text === '' || data.created_by === '') {
        return res.send('missing fields');
      }
      MongoClient.connect(CONNECTION_STRING, function(err, db) {
        if (err) return next(err)
        db.collection("issuetracking").insertOne(data, (err, doc) => {
          if (err) return next(err)
          console.log("Successfully added to the database");
          res.json(doc.ops[0]);
        })
      })
    })

    .put(function(req, res) {
      var project = req.params.project;
      var putQuery = {...req.body};
      if (req.body._id === '') {
        return res.send('no updated field sent');
      } else {
        delete putQuery['_id'];
      }
      for (let key in putQuery) {
        if (putQuery[key] === "" || putQuery[key] === undefined) {
          delete putQuery[key];
        }
      };

      if (Object.keys(putQuery).length > 0) {
        putQuery.updated_on = new Date();
      };

      if (req.body.open) {
        putQuery.open = false;
      };
      MongoClient.connect(CONNECTION_STRING, function(err, db) {
        if (err) {
          console.log(err);
        } else {
          db.collection("issuetracking")
            .findAndModify({
                _id: ObjectID(req.body._id)
              }, //query
              {}, //sort
              {
                $set: putQuery
              }, //update
              {
                new: true
              },
              (err, doc) => {
                if (Object.keys(putQuery).length <= 0) {
                  res.send("no updated field sent");
                } else if (err) {
                  res.send(err);
                } else if (doc.value === null) {
                  res.send("could not update " + ObjectID(req.body._id))
                } else {
                  res.send("successfully updated");
                }
              }
            )
        }
      })
    })

    .delete(function(req, res) {
      var project = req.params.project;
      if (req.body._id === ''){
        return res.send('No ID provided');
      }
      MongoClient.connect(CONNECTION_STRING, function(err, db) {
        if (err) {
          console.log(err);
        } else {
          console.log("delete here");
          db.collection("issuetracking")
            .deleteOne({
                _id: ObjectID(req.body._id)
              },
              (err, obj) => {
                if (err) return err;
                res.send('deleted ' + req.body._id);
                db.close();
              })
        }
      })
    })
};
