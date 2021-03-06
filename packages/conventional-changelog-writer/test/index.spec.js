'use strict'
var conventionalChangelogWriter = require('../')
var expect = require('chai').expect
var mocha = require('mocha')
var describe = mocha.describe
var it = mocha.it
var map = require('lodash').map
var through = require('through2')
var today = require('dateformat')(new Date(), 'yyyy-mm-dd', true)

describe('conventionalChangelogWriter', function () {
  function getStream () {
    var upstream = through.obj()
    upstream.write({
      hash: '9b1aff905b638aa274a5fc8f88662df446d374bd',
      header: 'feat(scope): broadcast $destroy event on scope destruction',
      body: null,
      footer: 'Closes #1',
      notes: [{
        title: 'BREAKING NEWS',
        text: 'breaking news'
      }],
      references: [{
        action: 'Closes',
        repository: null,
        issue: '1',
        raw: '#1'
      }, {
        action: 'Closes',
        repository: null,
        issue: '2',
        raw: '#2'
      }, {
        action: 'Closes',
        repository: null,
        issue: '3',
        raw: '#3'
      }]
    })
    upstream.write({
      hash: '13f31602f396bc269076ab4d389cfd8ca94b20ba',
      header: 'fix(ng-list): Allow custom separator',
      body: 'bla bla bla',
      footer: 'BREAKING CHANGE: some breaking change',
      notes: [{
        title: 'BREAKING CHANGE',
        text: 'some breaking change'
      }],
      references: []
    })
    upstream.write({
      hash: '2064a9346c550c9b5dbd17eee7f0b7dd2cde9cf7',
      header: 'perf(template): tweak',
      body: 'My body.',
      footer: '',
      notes: [],
      references: []
    })
    upstream.write({
      hash: '5f241416b79994096527d319395f654a8972591a',
      header: 'refactor(name): rename this module to conventional-changelog-writer',
      body: '',
      footer: '',
      notes: [],
      references: []
    })
    upstream.end()

    return upstream
  }

  describe('no commits', function () {
    it('should still work if there is no commits', function (done) {
      var i = 0

      var upstream = through.obj()
      upstream.end()
      upstream
        .pipe(conventionalChangelogWriter())
        .pipe(through(function (chunk, enc, cb) {
          expect(chunk.toString()).to.equal('<a name=""></a>\n##  (' + today + ')\n\n\n\n\n')

          i++
          cb(null)
        }, function () {
          expect(i).to.equal(1)
          done()
        }))
    })
  })

  describe('link', function () {
    it('should auto link if `context.repository`, `context.commit` and `context.issue` are truthy', function (done) {
      var i = 0

      getStream()
        .pipe(conventionalChangelogWriter({
          version: '0.5.0',
          title: 'this is a title',
          host: 'https://github.com',
          repository: 'a/b'
        }))
        .pipe(through(function (chunk, enc, cb) {
          expect(chunk.toString()).to.include('https://github.com/a/b/commits/13f3160')

          i++
          cb(null)
        }, function () {
          expect(i).to.equal(1)
          done()
        }))
    })

    it('should auto link if `context.repoUrl`, `context.commit` and `context.issue` are truthy', function (done) {
      var i = 0

      getStream()
        .pipe(conventionalChangelogWriter({
          version: '0.5.0',
          title: 'this is a title',
          repoUrl: 'https://github.com/a/b'
        }))
        .pipe(through(function (chunk, enc, cb) {
          expect(chunk.toString()).to.include('https://github.com/a/b/commits/13f3160')

          i++
          cb(null)
        }, function () {
          expect(i).to.equal(1)
          done()
        }))
    })

    it('should not auto link', function (done) {
      var i = 0

      getStream()
        .pipe(conventionalChangelogWriter())
        .pipe(through(function (chunk, enc, cb) {
          expect(chunk.toString()).to.not.include('https://github.com/a/b/commits/13f3160')

          i++
          cb(null)
        }, function () {
          expect(i).to.equal(1)
          done()
        }))
    })

    it('should not link references', function (done) {
      var i = 0

      getStream()
        .pipe(conventionalChangelogWriter({
          version: '0.5.0',
          title: 'this is a title',
          host: 'https://github.com',
          repository: 'a/b',
          linkReferences: false
        }))
        .pipe(through(function (chunk, enc, cb) {
          expect(chunk.toString()).to.not.include('https://github.com/a/b/commits/13f3160')

          i++
          cb(null)
        }, function () {
          expect(i).to.equal(1)
          done()
        }))
    })
  })

  describe('transform', function () {
    it('should transform the commit with context', function (done) {
      var i = 0

      getStream()
        .pipe(conventionalChangelogWriter({}, {
          transform: function (commit, context) {
            expect(context).to.eql({
              commit: 'commits',
              issue: 'issues',
              date: today
            })

            return commit
          }
        }))
        .pipe(through(function (chunk, enc, cb) {
          i++
          cb(null)
        }, function () {
          expect(i).to.equal(1)
          done()
        }))
    })

    it('should merge with the provided transform object', function (done) {
      var i = 0

      getStream()
        .pipe(conventionalChangelogWriter({}, {
          transform: {
            notes: function (notes) {
              map(notes, function (note) {
                if (note.title === 'BREAKING CHANGE') {
                  note.title = 'BREAKING CHANGES'
                }

                return note
              })

              return notes
            }
          }
        }))
        .pipe(through(function (chunk, enc, cb) {
          chunk = chunk.toString()

          expect(chunk).to.include('13f3160')
          expect(chunk).to.include('BREAKING CHANGES')
          expect(chunk).to.not.include('13f31602f396bc269076ab4d389cfd8ca94b20ba')

          i++
          cb(null)
        }, function () {
          expect(i).to.equal(1)
          done()
        }))
    })

    it('should ignore the commit if tranform returns `null`', function (done) {
      var i = 0

      getStream()
        .pipe(conventionalChangelogWriter({}, {
          transform: function () {
            return false
          }
        }))
        .pipe(through(function (chunk, enc, cb) {
          expect(chunk.toString()).to.equal('<a name=""></a>\n##  (' + today + ')\n\n\n\n\n')

          i++
          cb(null)
        }, function () {
          expect(i).to.equal(1)
          done()
        }))
    })
  })

  describe('generate', function () {
    function getStream () {
      var upstream = through.obj()
      upstream.write({
        header: 'feat(scope): broadcast $destroy event on scope destruction',
        body: null,
        footer: null,
        notes: [],
        references: [],
        committerDate: '2015-04-07 14:17:05 +1000'
      })
      upstream.write({
        header: 'fix(ng-list): Allow custom separator',
        body: 'bla bla bla',
        footer: null,
        notes: [],
        references: [],
        version: '1.0.1',
        committerDate: '2015-04-07 15:00:44 +1000'
      })
      upstream.write({
        header: 'perf(template): tweak',
        body: 'My body.',
        footer: null,
        notes: [],
        references: [],
        committerDate: '2015-04-07 15:01:30 +1000'
      })
      upstream.write({
        header: 'refactor(name): rename this module to conventional-changelog-writer',
        body: null,
        footer: null,
        notes: [],
        references: [],
        committerDate: '2015-04-08 09:43:59 +1000'
      })
      upstream.end()

      return upstream
    }

    it('should generate on the transformed commit', function (done) {
      var i = 0

      getStream()
        .pipe(conventionalChangelogWriter({
          version: '1.0.0'
        }, {
          transform: function (commit) {
            commit.version = '1.0.0'
            return commit
          }
        }))
        .pipe(through(function (chunk, enc, cb) {
          expect(chunk.toString()).to.contain('# 1.0.0 ')

          i++
          cb(null)
        }, function () {
          expect(i).to.equal(5)
          done()
        }))
    })

    describe('when commits are not reversed', function () {
      it('should generate on `\'version\'` if it\'s a valid semver', function (done) {
        var i = 0

        getStream()
          .pipe(conventionalChangelogWriter())
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            if (i === 0) {
              expect(chunk).to.include('<a name=""></a>\n##  (' + today)
              expect(chunk).to.include('feat(scope): ')

              expect(chunk).to.not.include('<a name="1.0.1"></a>')
              expect(chunk).to.not.include('fix(ng-list): ')
              expect(chunk).to.not.include('perf(template): ')
              expect(chunk).to.not.include('refactor(name): ')
            } else {
              expect(chunk).to.include('<a name="1.0.1"></a>\n## <small>1.0.1 (2015-04-07)</small>')
              expect(chunk).to.include('fix(ng-list): ')
              expect(chunk).to.include('perf(template): ')
              expect(chunk).to.include('refactor(name): ')

              expect(chunk).to.not.include('<a name=""></a>')
              expect(chunk).to.not.include('feat(scope): ')
            }

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(2)
            done()
          }))
      })

      it('`generateOn` could be a string', function (done) {
        var i = 0

        var upstream = through.obj()
        upstream.write({
          header: 'feat(scope): broadcast $destroy event on scope destruction',
          body: null,
          footer: null,
          notes: [],
          references: [],
          version: '1.0.1',
          committerDate: '2015-04-07 14:17:05 +1000'
        })
        upstream.write({
          header: 'fix(ng-list): Allow custom separator',
          body: 'bla bla bla',
          footer: null,
          notes: [],
          references: [],
          version: '2.0.1',
          committerDate: '2015-04-07 15:00:44 +1000'
        })
        upstream.write({
          header: 'perf(template): tweak',
          body: 'My body.',
          footer: null,
          notes: [],
          references: [],
          committerDate: '2015-04-07 15:01:30 +1000'
        })
        upstream.write({
          header: 'refactor(name): rename this module to conventional-changelog-writer',
          body: null,
          footer: null,
          notes: [],
          references: [],
          version: '4.0.1',
          committerDate: '2015-04-08 09:43:59 +1000'
        })
        upstream.end()

        upstream
          .pipe(conventionalChangelogWriter({}, {
            generateOn: 'version'
          }))
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            if (i === 0) {
              expect(chunk).to.include('<a name=""></a>\n##  (' + today)

              expect(chunk).to.not.include('<a name="1.0.1"></a>\n## 1.0.1 (2015-04-07)')
            } else if (i === 1) {
              expect(chunk).to.include('<a name="1.0.1"></a>')
              expect(chunk).to.include('feat(scope): broadcast $destroy event on scope destruction')
            } else if (i === 2) {
              expect(chunk).to.include('<a name="2.0.1"></a>')
              expect(chunk).to.include('fix(ng-list): Allow custom separator')
              expect(chunk).to.include('perf(template): tweak')
            } else if (i === 3) {
              expect(chunk).to.include('<a name="4.0.1"></a>')
              expect(chunk).to.include('refactor(name): rename this module to conventional-changelog-writer')

              expect(chunk).to.not.include('perf(template): tweak')
            }

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(4)
            done()
          }))
      })

      it('`generateOn` could be a function', function (done) {
        var i = 0

        getStream()
          .pipe(conventionalChangelogWriter({}, {
            generateOn: function (commit, commits, context, options) {
              expect(commits.length).to.be.a('number')
              expect(context.commit).to.equal('commits')
              expect(options.groupBy).to.equal('type')

              return commit.version
            }
          }))
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            if (i === 0) {
              expect(chunk).to.include('<a name=""></a>\n##  (' + today)
              expect(chunk).to.not.include('<a name="1.0.1"></a>\n## 1.0.1 (2015-04-07)')
            } else {
              expect(chunk).to.include('<a name="1.0.1"></a>')
              expect(chunk).to.not.include('<a name=""></a>')
            }

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(2)
            done()
          }))
      })

      it('`generateOn` could be a null', function (done) {
        var i = 0

        getStream()
          .pipe(conventionalChangelogWriter({}, {
            generateOn: null
          }))
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            expect(chunk).to.include('<a name=""></a>\n##  (' + today)

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(1)
            done()
          }))
      })

      it('version should fall back on `context.version` and `context.date`', function (done) {
        var i = 0

        getStream()
          .pipe(conventionalChangelogWriter({
            version: '0.0.1',
            date: '2015-01-01'
          }))
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            if (i === 0) {
              expect(chunk).to.include('<a name="0.0.1"></a>\n## <small>0.0.1 (2015-01-01)</small>')
              expect(chunk).to.not.include('<a name="1.0.1"></a>')
            } else {
              expect(chunk).to.include('<a name="1.0.1"></a>\n## <small>1.0.1 (2015-04-07)</small>')
              expect(chunk).to.not.include('<a name="0.0.1"></a>')
            }

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(2)
            done()
          }))
      })

      it('should still generate a block even if the commit is ignored', function (done) {
        var i = 0

        getStream()
          .pipe(conventionalChangelogWriter({}, {
            transform: function () {
              return false
            }
          }))
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            if (i === 0) {
              expect(chunk).to.equal('<a name=""></a>\n##  (' + today + ')\n\n\n\n\n')
            } else {
              expect(chunk).to.equal('<a name="1.0.1"></a>\n## <small>1.0.1 (2015-04-07 15:00:44 +1000)</small>\n\n\n\n\n')
            }

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(2)
            done()
          }))
      })

      it('should include details', function (done) {
        var i = 0

        getStream()
          .pipe(conventionalChangelogWriter({}, {
            includeDetails: true
          }))
          .pipe(through.obj(function (chunk, enc, cb) {
            if (i === 0) {
              expect(chunk.log).to.include('<a name=""></a>\n##  (' + today + ')\n\n')
              expect(chunk.log).to.include('feat(scope): broadcast $destroy event on scope destruction')
              expect(chunk.keyCommit).to.eql()
            } else {
              expect(chunk.log).to.include('<a name="1.0.1"></a>\n## <small>1.0.1 (2015-04-07)</small>\n\n')
              expect(chunk.log).to.include('fix(ng-list): Allow custom separator')
              expect(chunk.log).to.include('perf(template): tweak')
              expect(chunk.log).to.include('refactor(name): rename this module to conventional-changelog-writer')
              expect(chunk.keyCommit.body).to.equal('bla bla bla')
              expect(chunk.keyCommit.committerDate).to.equal('2015-04-07')
              expect(chunk.keyCommit.version).to.equal('1.0.1')
            }

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(2)
            done()
          }))
      })

      it('should not flush when previous release is generated', function (done) {
        var i = 0

        var upstream = through.obj()
        upstream.write({
          header: 'feat(scope): broadcast $destroy event on scope destruction',
          body: null,
          footer: null,
          notes: [{
            title: 'BREAKING CHANGE',
            text: 'No backward compatibility.'
          }],
          references: [],
          committerDate: '2015-04-07 14:17:05 +1000',
          version: 'v1.0.0'
        })
        upstream.write({
          header: 'feat(scope): broadcast $destroy event on scope destruction',
          body: null,
          footer: null,
          notes: [{
            title: 'BREAKING CHANGE',
            text: 'No backward compatibility.'
          }],
          references: [],
          committerDate: '2015-04-07 14:17:05 +1000',
          version: 'v0.1.4'
        })
        upstream.end()

        upstream
          .pipe(conventionalChangelogWriter({
            version: 'v2.0.0'
          }, {
            doFlush: false
          }))
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            if (i === 0) {
              expect(chunk).to.contain('1.0.0')
              expect(chunk).not.to.contain('2.0.0')
            } else {
              expect(chunk).to.contain('0.1.4')
            }

            i++
            cb()
          }, function () {
            expect(i).to.equal(2)
            done()
          }))
      })

      it('should not flush when it is the only potential release', function (done) {
        var upstream = through.obj()
        upstream.write({
          header: 'feat(scope): broadcast $destroy event on scope destruction',
          body: null,
          footer: null,
          notes: [{
            title: 'BREAKING CHANGE',
            text: 'No backward compatibility.'
          }],
          references: [],
          committerDate: '2015-04-07 14:17:05 +1000'
        })
        upstream.end()

        upstream
          .pipe(conventionalChangelogWriter({
            version: 'v2.0.0'
          }, {
            doFlush: false
          }))
          .pipe(through(function () {
            done(new Error('should not flush when it is the only potential release'))
          }, function () {
            done()
          }))
      })
    })

    describe('when commits are reversed', function () {
      it('should generate on `\'version\'` if it\'s a valid semver', function (done) {
        var i = 0

        var upstream = through.obj()
        upstream.write({
          header: 'feat(scope): broadcast $destroy event on scope destruction',
          body: null,
          footer: null,
          notes: [],
          references: [],
          version: '1.0.1',
          committerDate: '2015-04-07 14:17:05 +1000'
        })
        upstream.write({
          header: 'fix(ng-list): Allow custom separator',
          body: 'bla bla bla',
          footer: null,
          notes: [],
          references: [],
          version: '2.0.1',
          committerDate: '2015-04-07 15:00:44 +1000'
        })
        upstream.write({
          header: 'perf(template): tweak',
          body: 'My body.',
          footer: null,
          notes: [],
          references: [],
          committerDate: '2015-04-07 15:01:30 +1000'
        })
        upstream.write({
          header: 'refactor(name): rename this module to conventional-changelog-writer',
          body: null,
          footer: null,
          notes: [],
          references: [],
          version: '4.0.1',
          committerDate: '2015-04-08 09:43:59 +1000'
        })
        upstream.end()

        upstream
          .pipe(conventionalChangelogWriter({}, {
            reverse: true
          }))
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            if (i === 0) {
              expect(chunk).to.include('<a name="1.0.1"></a>\n## <small>1.0.1 (2015-04-07)</small>')
              expect(chunk).to.include('feat(scope): ')

              expect(chunk).to.not.include('<a name=""></a>')
              expect(chunk).to.not.include('perf(template): ')
              expect(chunk).to.not.include('refactor(name): ')
            } else if (i === 1) {
              expect(chunk).to.include('<a name="2.0.1"></a>\n## <small>2.0.1 (2015-04-07)</small>')
              expect(chunk).to.include('fix(ng-list): ')

              expect(chunk).to.not.include('<a name="1.0.1"></a>')
              expect(chunk).to.not.include('feat(scope): ')
            } else if (i === 2) {
              expect(chunk).to.include('<a name="4.0.1"></a>\n#')
              expect(chunk).to.include('perf(template): ')
              expect(chunk).to.include('refactor(name): ')
            } else if (i === 3) {
              expect(chunk).to.include('<a name=""></a>\n##  (' + today)
            }

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(4)
            done()
          }))
      })

      it('should still generate a block even if the commit is ignored', function (done) {
        var i = 0

        getStream()
          .pipe(conventionalChangelogWriter({}, {
            transform: function () {
              return false
            },
            reverse: true
          }))
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            if (i === 0) {
              expect(chunk).to.equal('<a name="1.0.1"></a>\n## <small>1.0.1 (2015-04-07 15:00:44 +1000)</small>\n\n\n\n\n')
            } else {
              expect(chunk).to.equal('<a name=""></a>\n##  (' + today + ')\n\n\n\n\n')
            }

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(2)
            done()
          }))
      })

      it('should include details', function (done) {
        var i = 0

        getStream()
          .pipe(conventionalChangelogWriter({}, {
            reverse: true,
            includeDetails: true
          }))
          .pipe(through.obj(function (chunk, enc, cb) {
            if (i === 0) {
              expect(chunk.log).to.include('<a name="1.0.1"></a>\n## <small>1.0.1 (2015-04-07)</small>\n\n')
              expect(chunk.log).to.include('broadcast $destroy event on scope destruction')
              expect(chunk.log).to.include('fix(ng-list):')
              expect(chunk.keyCommit.version).to.equal('1.0.1')
              expect(chunk.keyCommit.committerDate).to.equal('2015-04-07')
            } else {
              expect(chunk.log).to.include('<a name=""></a>\n##  (' + today + ')\n\n')
              expect(chunk.log).to.include('perf(template): tweak')
              expect(chunk.log).to.include('refactor(name): rename this module to conventional-changelog-writer')
              expect(chunk.keyCommit).to.eql()
            }

            i++
            cb(null)
          }, function () {
            expect(i).to.equal(2)
            done()
          }))
      })

      it('should not flush when previous release is generated', function (done) {
        var i = 0

        var upstream = through.obj()
        upstream.write({
          header: 'feat(scope): broadcast $destroy event on scope destruction',
          body: null,
          footer: null,
          notes: [{
            title: 'BREAKING CHANGE',
            text: 'No backward compatibility.'
          }],
          references: [],
          committerDate: '2015-04-07 14:17:05 +1000',
          version: 'v1.0.0'
        })
        upstream.write({
          header: 'feat(scope): broadcast $destroy event on scope destruction',
          body: null,
          footer: null,
          notes: [{
            title: 'BREAKING CHANGE',
            text: 'No backward compatibility.'
          }],
          references: [],
          committerDate: '2015-04-07 14:17:05 +1000',
          version: 'v2.0.290'
        })
        upstream.end()

        upstream
          .pipe(conventionalChangelogWriter({
            version: 'v2.0.0'
          }, {
            reverse: true,
            doFlush: false
          }))
          .pipe(through(function (chunk, enc, cb) {
            chunk = chunk.toString()

            if (i === 0) {
              expect(chunk).to.contain('1.0.0')
              expect(chunk).not.to.contain('2.0.0')
            } else {
              expect(chunk).to.contain('2.0.290')
            }

            i++
            cb()
          }, function () {
            expect(i).to.equal(2)
            done()
          }))
      })
    })

    it('should not flush when it is the only potential release', function (done) {
      var upstream = through.obj()
      upstream.write({
        header: 'feat(scope): broadcast $destroy event on scope destruction',
        body: null,
        footer: null,
        notes: [{
          title: 'BREAKING CHANGE',
          text: 'No backward compatibility.'
        }],
        references: [],
        committerDate: '2015-04-07 14:17:05 +1000'
      })
      upstream.end()

      upstream
        .pipe(conventionalChangelogWriter({
          version: 'v2.0.0'
        }, {
          reverse: true,
          doFlush: false
        }))
        .pipe(through(function () {
          done(new Error('should not flush when it is the only potential release'))
        }, function () {
          done()
        }))
    })
  })

  it('should ignore the field if it doesn\'t exist', function (done) {
    var i = 0

    var upstream = through.obj()
    upstream.write({
      header: 'bla',
      body: null,
      footer: null,
      notes: []
    })
    upstream.end()
    upstream
      .pipe(conventionalChangelogWriter())
      .pipe(through(function (chunk, enc, cb) {
        expect(chunk.toString()).to.equal('<a name=""></a>\n##  (' + today + ')\n\n* bla \n\n\n\n')

        i++
        cb(null)
      }, function () {
        expect(i).to.equal(1)
        done()
      }))
  })

  it('should sort notes on `text` by default', function (done) {
    var upstream = through.obj()
    upstream.write({
      header: 'feat(scope): broadcast $destroy event on scope destruction',
      body: null,
      footer: null,
      notes: [{
        title: 'BREAKING CHANGE',
        text: 'No backward compatibility.'
      }],
      references: [],
      committerDate: '2015-04-07 14:17:05 +1000'
    })
    upstream.write({
      header: 'fix(ng-list): Allow custom separator',
      body: 'bla bla bla',
      footer: null,
      notes: [{
        title: 'BREAKING CHANGE',
        text: 'Another change.'
      }, {
        title: 'BREAKING CHANGE',
        text: 'Some breaking change.'
      }],
      references: [],
      committerDate: '2015-04-07 15:00:44 +1000'
    })
    upstream.end()

    upstream
      .pipe(conventionalChangelogWriter())
      .pipe(through(function (chunk) {
        expect(chunk.toString()).to.match(/Another change.[\w\W]*No backward compatibility.[\w\W]*Some breaking change./)

        done()
      }))
  })

  it('should not error if version is not semver', function (done) {
    getStream()
      .pipe(conventionalChangelogWriter({
        version: 'a.b.c'
      }))
      .on('error', function (err) {
        done(err)
      })
      .pipe(through(function (chunk) {
        expect(chunk.toString()).to.include('a.b.c')

        done()
      }))
  })

  it('should callback with error on transform', function (done) {
    getStream()
      .pipe(conventionalChangelogWriter({}, {
        transform: function () {
          return undefined.a
        }
      }))
      .on('error', function (err) {
        expect(err).to.be.ok // eslint-disable-line no-unused-expressions
        done()
      })
  })

  it('should callback with error on flush', function (done) {
    getStream()
      .pipe(conventionalChangelogWriter({}, {
        finalizeContext: function () {
          return undefined.a
        }
      }))
      .on('error', function (err) {
        expect(err).to.be.ok // eslint-disable-line no-unused-expressions
        done()
      })
  })

  it('should show your final context', function (done) {
    getStream()
      .pipe(conventionalChangelogWriter({}, {
        debug: function (context) {
          expect(context).to.include('Your final context is:\n')
          done()
        }
      }))
  })
})
