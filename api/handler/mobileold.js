const httpStatus = require('http-status');
const globals = require('../../global_constant');
const commonUtility = require("../helpers/commonUtility");
const ObjectId = require('mongodb').ObjectID;
var async = require("async");
const request = require('request');
let internationalMensTeams=[498,5,23,490,25,11,7,13,19,21,17,493,9,1824,9160,9140,10798,10814,1544,1546,6791,15];
let internationalWomensTeams=[8652,10712,9534,9536,10511,8650,10259,10279,10277,10272,14619,14624,14627,26768,26771];
let iplTeams=[591,593,610,612,627,629,646,658];
function Mobile() {

    /**
     * function to get all contest 
     */
    this.getAllContest = function (req, res) {
        try {
            commonUtility.validateUser(req, res, (validateUser) => {
                if (validateUser.status && validateUser.isAnonymousToken === false) {
                    let contest = db.collection("contest");
                    let Users = db.collection("users");
                    let userId = validateUser.userId;
                    contest.aggregate([
                        {
                            $match: { isActive: true }
                        },
                        {
                            $project: {
                                contestId: 1,
                                contestData: 1
                            }
                        }
                    ]).toArray((error, result) => {
                        if (error) {
                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.something_went_wrong']
                            })
                        } else {
                            if (result.length > 0) {
                                Users.findOne(
                                    { '_id': ObjectId(userId), isActive: true }
                                ).then(result1 => {
                                    let refferalCode = result1.refferalCode;
                                    let contestCount = result1.contestCount
                                    let finalResult = {
                                        contest: result[0],
                                        refferalCode: refferalCode,
                                        contestCount: contestCount
                                    }
                                    res.status(httpStatus.OK).json({
                                        status: true,
                                        statusCode: 200,
                                        message: "success",
                                        result: finalResult
                                    })
                                }).catch(error => {
                                });

                            } else {
                                res.status(httpStatus.OK).json({
                                    status: false,
                                    statusCode: 200,
                                    message: text_settings['avtars.no_record_exists']
                                })
                            }
                        }
                    });
                } else {
                    let contest = db.collection("contest");
                    contest.aggregate([
                        {
                            $match: { isActive: true }
                        },
                        {
                            $project: {
                                contestId: 1,
                                contestData: 1
                            }
                        }
                    ]).toArray((error, result) => {
                        if (error) {
                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.something_went_wrong']
                            })
                        } else {
                            if (result.length > 0) {
                                let finalResult = {
                                    contest: result[0]
                                }
                                res.status(httpStatus.OK).json({
                                    status: true,
                                    statusCode: 200,
                                    message: "success",
                                    result: finalResult
                                })
                            } else {
                                res.status(httpStatus.OK).json({
                                    status: false,
                                    statusCode: 200,
                                    message: text_settings['avtars.no_record_exists']
                                })
                            }
                        }
                    });
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            })
        }
    }//End 

    //function to select contest
    this.selectContest = function (req, res) {
        try {
            commonUtility.validateUser(req, res, (validateUser) => {
                if (validateUser.status && validateUser.isAnonymousToken === false) {
                    commonUtility.isPost(req, res, function (isPost) {
                        if (isPost) {
                            req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                            req.checkBody({
                                "contestId": {
                                    notEmpty: true,
                                    isAlphanumeric: true,
                                    isLength: { options: [24, 24] },
                                    errorMessage: text_settings["user.commentId_required"]
                                }
                            });
                            var errors = commonUtility.parseValidation(req.validationErrors(), req);
                            if (!errors) {
                                let contest = db.collection("contest");
                                let Users = db.collection("users");
                                let userId = validateUser.userId;
                                let contestId = req.body.contestId;
                                let option = req.body.option;
                                let participantObj = {
                                    userId: userId,
                                    option: option
                                }
                                Users.findOne(
                                    { '_id': ObjectId(userId), isActive: true }
                                ).then(result => {
                                    if (result.contestCount == 0) {
                                        res.status(httpStatus.OK).json({
                                            status: true,
                                            statusCode: 200,
                                            message: "you don't have chances to participate in contest",
                                        });
                                    } else {
                                        contest.findOneAndUpdate(
                                            {
                                                'contestId': ObjectId(contestId)
                                            },
                                            {
                                                $push: {
                                                    'contestParticipant': participantObj
                                                }
                                            }
                                        ).then(result => {
                                            if (result.value === null) {
                                                res.status(httpStatus.OK).json({
                                                    status: false,
                                                    result: {
                                                        message: text_settings['comment.not_exists']
                                                    }
                                                });
                                            } else {
                                                Users.findOneAndUpdate(
                                                    { '_id': ObjectId(userId), isActive: true },
                                                    {
                                                        $inc: { contestCount: -1 }
                                                    },
                                                    { returnOriginal: false }).then(result => {
                                                    }).catch(error => {
                                                    });
                                                res.status(httpStatus.OK).json({
                                                    status: true,
                                                    statusCode: 200,
                                                    message: text_settings['contest.submitted'],
                                                    // result: {
                                                    //     message: text_settings['contest.submitted']
                                                    // }
                                                });
                                            }
                                        }).catch(error => {
                                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                status: false,
                                                statusCode: 500,
                                                message: text_settings['system.something_went_wrong']
                                            });
                                        });
                                    }
                                }).catch(error => {
                                });
                            } else {
                                res.status(httpStatus.BAD_REQUEST).json({
                                    status: false,
                                    statusCode: 400,
                                    message: text_settings['system.something_went_wrong']
                                });
                            }
                        } else {
                            res.status(httpStatus.UNAUTHORIZED).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.Please_send_data_using_post_method'],
                            });
                        }
                    });
                } else {
                    res.status(validateUser.statusCode).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.something_went_wrong']
                    });
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }

    /**
     * function to poll selection
     */
    this.pollSelection = (req, res) => {
        try {
            commonUtility.validateUser(req, res, (validateUser) => {
                if (validateUser.status && validateUser.isAnonymousToken === false) {
                    commonUtility.isPost(req, res, function (isPost) {
                        if (isPost) {
                            req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                            req.checkBody({
                                "pollId": {
                                    notEmpty: true,
                                    isAlphanumeric: true,
                                    isLength: { options: [24, 24] },
                                    errorMessage: text_settings["poll.id_required"]
                                }
                            });
                            var errors = commonUtility.parseValidation(req.validationErrors(), req);
                            if (!errors) {
                                let userId = validateUser.userId;
                                let pollId = req.body.pollId;
                                let option = parseInt(req.body.option);
                                let poll = db.collection("poll");
                                poll.findOne(
                                    {
                                        '_id': ObjectId(pollId)
                                    }, (err, result) => {
                                        if (err) {
                                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                status: false,
                                                statusCode: 500,
                                                message: text_settings['system.something_went_wrong']
                                            });
                                        }
                                        else {
                                            let voteobj = {
                                                userId: (userId).toString(),
                                                option: option
                                            }
                                            if (option == result.teamAId) {
                                                result.teamAcount = result.teamAcount + 1;
                                                totalcount = result.teamAcount + result.teamBcount;
                                                result.teamApercentage = (result.teamAcount * 100) / totalcount;
                                                result.teamBpercentage = (result.teambcount * 100) / totalcount;
                                            } else
                                                if (option == result.teamBId) {
                                                    result.teamBcount = result.teamBcount + 1;
                                                    totalcount = result.teamAcount + result.teamBcount;
                                                    result.teamApercentage = (result.teamAcount * 100) / totalcount;
                                                    result.teamBpercentage = (result.teamBcount * 100) / totalcount;
                                                }
                                            poll.findOneAndUpdate(
                                                {
                                                    '_id': ObjectId(pollId)
                                                },
                                                {
                                                    $set: {
                                                        'teamApercentage': result.teamApercentage,
                                                        'teamBpercentage': result.teamBpercentage,
                                                        'teamAcount': result.teamAcount,
                                                        'teamBcount': result.teamBcount,
                                                        'updatedAt': new Date()
                                                    },
                                                    $push: {
                                                        'voted': voteobj,
                                                    }
                                                }
                                            ).then(data => {
                                                res.status(httpStatus.OK).json({
                                                    status: true,
                                                    statusCode: 200,
                                                    message: "success",
                                                    result: {
                                                        _id: data.value._id,
                                                        matchId: data.value.matchId,
                                                        teamAName: data.value.teamAName,
                                                        teamAId: data.value.teamAId,
                                                        teamApercentage: data.value.teamApercentage,
                                                        teamBpercentage: data.value.teamBpercentage,
                                                        teamBName: data.value.teamBName,
                                                        teamBId: data.value.teamBId,
                                                    }
                                                });

                                            }).catch(error => {
                                            });
                                        }
                                    }
                                )
                            } else {
                                res.status(httpStatus.BAD_REQUEST).json({
                                    status: false,
                                    statusCode: 400,
                                    message: text_settings['system.Please_send_data_using_post_method'],
                                });
                            }
                        } else {
                            res.status(httpStatus.BAD_REQUEST).json({
                                status: false,
                                statusCode: 400,
                                message: text_settings['system.Please_send_data_using_post_method'],
                            });
                        }
                    });
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }

    /**
             * function to get  Banner 
             */
    this.getBannerForApp = function (req, res) {
        try {
            let banner = db.collection("banner");
            banner.aggregate([
                {
                    $match: { 'isActive': true }
                },
                {
                    $project: {
                        _id: 0,
                        name: 1,
                        image: 1,
                        url: 1,
                        bannerNo: 1
                    }
                }
            ]).toArray((error, result) => {
                if (error) {
                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.something_went_wrong']
                    })
                } else {
                    if (result.length > 0) {
                        res.status(httpStatus.OK).json({
                            status: true,
                            statusCode: 200,
                            message: "success",
                            result: result
                        })
                    } else {
                        res.status(httpStatus.OK).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['avtars.no_record_exists']
                        })
                    }
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            })
        }
    }//End 

    this.getPublishedNewsForApp = (req, res) => {
        try {
            commonUtility.isPost(req, res, function (isPost) {
                if (isPost) {
                    req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                    req.checkBody({
                        "page": {
                            notEmpty: true,
                            isNumeric: true,
                            errorMessage: text_settings["user.page_required"]
                        }
                    });
                    let errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        let page = parseInt(req.body.page);
                        let sortBy = "createdAt";
                        let sortByType = -1;
                        let sortFilter = {};
                        sortFilter[sortBy] = sortByType;
                        let limit = 10;
                        let skip = limit * (page - 1);
                        let News = db.collection("news");
                        let filter = { 'isPublished': true, 'isActive': true, };
                        async.parallel({
                            count: (callback) => {
                                News.countDocuments().then(count => {
                                    callback(null, count);
                                }).catch(err => {
                                    callback(err, null);
                                });
                            },
                            result: (callback) => {
                                News.aggregate([
                                    {
                                        $match: filter
                                    },
                                    {
                                        $sort: sortFilter
                                    },
                                    {
                                        $limit: skip + limit
                                    },
                                    {
                                        $skip: skip
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            id: "$_id",
                                            heading: 1,
                                            createdAt: { $subtract: ["$createdAt", new Date("1970-01-01")] },
                                            creditTo: 1,
                                            newsBody: { $trim: { input: "$newsBody" } },
                                            sourceUrl: 1,
                                            publishedImage: 1,
                                        }
                                    }
                                ]).toArray((err, usersList) => {
                                    callback(err, usersList);
                                });
                            }
                        }, (error, results) => {
                            if (error) {
                                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                    status: false,
                                    // error: error.message
                                    error: text_settings['system.something_went_wrong']
                                });
                            } else {
                                res.status(httpStatus.OK).json({
                                    status: true,
                                    statusCode: 200,
                                    message: "success",
                                    page: page,
                                    limit: limit,
                                    count: results.count,
                                    result: results.result,
                                    sortBy: ["createdAt"]
                                });
                            }
                        })
                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            statusCode: 400,
                            message: text_settings['system.something_went_wrong']
                        });
                    }
                } else {
                    res.status(httpStatus.UNAUTHORIZED).json({
                        status: false,
                        statusCode: 401,
                        message: text_settings['system.Please_send_data_using_post_method'],
                    });
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }//End

    /**
     * function to upload Image 
     */
    this.uploadImage = function (req, res) {
        try {
            res.status(httpStatus.OK).json({
                status: true,
                statusCode: 200,
                message: "success",
                result: req.file
            })
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['Invalid File Format']
            })
        }
    }//End

    this.getMatchListingForLive = (req, res) => {
        try {
            let Match = db.collection("match");
            let filter = { 'type': "live" };
            Match.aggregate([
                {
                    $match: filter
                },
                { $unwind: '$items' },

                {
                    $sort: { "items.timestamp_start": 1, "items.match_id": 1 }
                },
                {
                    $project: {
                        _id: 0,
                        matchId: "$items.match_id",
                        title: "$items.title",
                        format: "$items.format_str",
                        subtitle: "$items.subtitle",
                        prediction: "$items.prediction",
                        category: "$items.competition.category",
                        leagueName: "$items.competition.title",
                        leagueId: "$items.competition.cid",
                        statusNote: "$items.status_note",
                        teamA: "$items.teama",
                        teamB: "$items.teamb",
                        venue: "$items.venue",
                        result: "$items.result",
                        winMargin: "$items.win_margin",
                        winningTeamId: "$items.winning_team_id",
                        start: "$items.timestamp_start",
                        end: "$items.timestamp_end",
                    }
                }
            ]).toArray((err, results) => {
                if (err) {
                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.something_went_wrong']
                    });
                } else if (results.length == 0) {
                    res.status(httpStatus.OK).json({
                        status: true,
                        statusCode: 200,
                        message: "success",
                        result: []
                    });
                } else {
                    let domestic = [];
                    let domesticFilter = [];
                    let internationalFilter = [];
                    let international = [];
                    let finalResult = [];
                    results.forEach((x) => {
                        if (x.category == "domestic") {
                            domesticFilter.push(x);
                        } else if (x.category == "international") {
                            internationalFilter.push(x);
                        }
                    })
                    domestic = setObjectForLive(domesticFilter);
                    international = setObjectForLive(internationalFilter);
                    finalDomestic = {
                        type: "Domestic",
                        matches: domestic,
                    }
                    finalInternational = {
                        type: "International",
                        matches: international
                    }
                    finalResult.push(finalInternational);
                    finalResult.push(finalDomestic);
                    res.status(httpStatus.OK).json({
                        status: true,
                        statusCode: 200,
                        message: "success",
                        result: finalResult,
                    });
                }
            })
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }

    this.getMatchListingForResult = (req, res) => {
        try {
            let Match = db.collection("match");
            let filter = { 'type': "completed" };
            Match.aggregate([
                {
                    $match: filter
                },
                { $unwind: '$items' },
                {
                    $sort: { "items.competition.title": 1, "items.timestamp_start": -1, "items.match_id": -1 }
                },
                {
                    $project: {
                        _id: 0,
                        matchId: "$items.match_id",
                        title: "$items.title",
                        subtitle: "$items.subtitle",
                        format: "$items.format_str",
                        category: "$items.competition.category",
                        leagueName: "$items.competition.title",
                        leagueId: "$items.competition.cid",
                        statusNote: "$items.status_note",
                        teamA: "$items.teama",
                        teamB: "$items.teamb",
                        venue: "$items.venue",
                        result: "$items.result",
                        winMargin: "$items.win_margin",
                        winningTeamId: "$items.winning_team_id",
                        start: "$items.timestamp_start",
                        end: "$items.timestamp_end"
                    }
                }
            ]).toArray((err, results) => {
                if (err) {
                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.something_went_wrong']
                    });
                } else if (results.length == 0) {
                    res.status(httpStatus.OK).json({
                        status: true,
                        statusCode: 200,
                        message: "success",
                        result: []
                    });
                } else {
                    let domestic = [];
                    let domesticFilter = [];
                    let internationalFilter = [];
                    let international = [];
                    let finalResult = [];
                    results.forEach((x) => {
                        if (x.category == "domestic") {
                            domesticFilter.push(x);
                        } else if (x.category == "international") {
                            internationalFilter.push(x);
                        }
                    })
                    domestic = setObjectForLive(domesticFilter);
                    international = setObjectForLive(internationalFilter);
                    finalDomestic = {
                        type: "Domestic",
                        matches: domestic,
                    }
                    finalInternational = {
                        type: "International",
                        matches: international
                    }
                    finalResult.push(finalInternational);
                    finalResult.push(finalDomestic);
                    res.status(httpStatus.OK).json({
                        status: true,
                        statusCode: 200,
                        message: "success",
                        result: finalResult,
                    });
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }

    this.getMatchListingForUpcoming = (req, res) => {
        try {
            let Match = db.collection("match");
            let filter = { 'type': "upcoming" };
            Match.aggregate([
                {
                    $match: filter
                },
                { $unwind: '$items' },
                {
                    $sort: { "items.competition.title": 1, "items.timestamp_start": 1, "items.match_id": 1 }
                },
                {
                    $project: {
                        _id: 0,
                        matchId: "$items.match_id",
                        title: "$items.title",
                        subtitle: "$items.subtitle",
                        format: "$items.format_str",
                        category: "$items.competition.category",
                        leagueName: "$items.competition.title",
                        leagueId: "$items.competition.cid",
                        statusNote: "$items.status_note",
                        teamA: "$items.teama",
                        teamB: "$items.teamb",
                        venue: "$items.venue",
                        result: "$items.result",
                        winMargin: "$items.win_margin",
                        winningTeamId: "$items.winning_team_id",
                        dateStart: "$items.date_start",
                        dateEnd: "$items.date_end",
                        start: "$items.timestamp_start",
                        end: "$items.timestamp_end"
                    }
                }
            ]).toArray((err, results) => {
                if (err) {
                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.something_went_wrong']
                    });
                } else if (results.length == 0) {
                    res.status(httpStatus.OK).json({
                        status: true,
                        statusCode: 200,
                        message: "success",
                        result: []
                    });
                } else {
                    let domestic = [];
                    let domesticFilter = [];
                    let internationalFilter = [];
                    let international = [];
                    let finalResult = [];
                    results.forEach((x) => {
                        if (x.category == "domestic") {
                            domesticFilter.push(x);
                        } else if (x.category == "international") {
                            internationalFilter.push(x);
                        }
                    })
                    domestic = setObjectForLive(domesticFilter);
                    international = setObjectForLive(internationalFilter);
                    finalDomestic = {
                        type: "Domestic",
                        matches: domestic,
                    }
                    finalInternational = {
                        type: "International",
                        matches: international
                    }
                    finalResult.push(finalInternational);
                    finalResult.push(finalDomestic);
                    res.status(httpStatus.OK).json({
                        status: true,
                        statusCode: 200,
                        message: "success",
                        result: finalResult,
                    });
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }

    function setObjectForLive(list) {
        let branchList = [];
        let parentList = [];
        list.forEach(x => {
            if (parentList.indexOf(x.leagueName) == -1) {//not exists
                let y = {};
                y.league = x.leagueName;
                y.leagueId = x.leagueId;
                y.leagueMatches = [];
                y.leagueMatches.push(x);
                parentList.push(x.leagueName);
                branchList.push(y);
            }
            else {
                branchList.forEach((z) => {
                    if (z.league == x.leagueName) {
                        z.leagueMatches.push(x);
                    }
                })
            }
        })
        return branchList;
    }

    this.getMatchInfoListing = (req, res) => {
        try {
            req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
            req.checkBody({
                "matchId": {
                    notEmpty: true,
                    errorMessage: text_settings["user.page_required"]
                }
            });
            let errors = commonUtility.parseValidation(req.validationErrors(), req);
            if (!errors) {
                let matchId = parseInt(req.body.matchId);
                let userId = req.body.userId == undefined ? "" : req.body.userId;
                let Match = db.collection("scorecardDetailForCricket");
                let filter = { 'matchId': matchId };
                Match.aggregate([
                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "poll",
                            let: { "matchId": "$scorecard.match_id" },
                            pipeline: [
                                { $match: { $expr: { $eq: ["$matchId", "$$matchId"] } } },
                                {
                                    $project: {
                                        _id: 1,
                                        teamAName: 1,
                                        teamAId: 1,
                                        teamApercentage: 1,
                                        teamBpercentage: 1,
                                        teamBName: 1,
                                        teamBId: 1,
                                    }
                                },
                            ],
                            as: "predictionDetail"
                        }
                    },
                    {
                        $lookup: {
                            from: "poll",
                            let: { "matchId": "$scorecard.match_id" },
                            pipeline: [
                                { $match: { $expr: { $eq: ["$matchId", "$$matchId"] } } },
                                { $unwind: "$voted" },
                                {
                                    $project: {
                                        _id: 0,
                                        voted: "$voted.userId",
                                        option: "$voted.option"
                                    }
                                },
                            ],
                            as: "votingDetail"
                        }
                    },
                    {
                        $project: {
                            updatedAt: "$updatedAt",
                            _id: 0,
                            matchId: "$scorecard.match_id",
                            title: "$scorecard.title",
                            status: "$scorecard.status",
                            umpires: "$scorecard.umpires",
                            referee: "$scorecard.referee",
                            toss: "$scorecard.toss",
                            matchSubtitle: "$scorecard.subtitle",
                            startDate: "$scorecard.date_start",
                            endDate: "$scorecard.date_end",
                            totalMatches: "$scorecard.competition.total_matches",
                            totalRounds: "$scorecard.competition.total_rounds",
                            totalTeams: "$scorecard.competition.total_teams",
                            format: "$scorecard.format_str",
                            category: "$scorecard.competition.category",
                            leagueName: "$scorecard.competition.title",
                            leagueId: "$scorecard.competition.cid",
                            format: "$scorecard.format_str",
                            statusNote: "$scorecard.status_note",
                            teamA: "$scorecard.teama.name",
                            teamAImage: "$scorecard.teama.logo_url",
                            teamB: "$scorecard.teamb.name",
                            teamBImage: "$scorecard.teamb.logo_url",
                            venue: "$scorecard.venue",
                            result: "$scorecard.result",
                            winMargin: "$scorecard.win_margin",
                            winningTeamId: "$scorecard.winning_team_id",
                            start: "$scorecard.timestamp_start",
                            end: "$scorecard.timestamp_end",
                            poll: "$predictionDetail",
                            voted: "$votingDetail"
                        }
                    }
                ]).toArray((error, results) => {
                    if (error) {
                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                        });
                    } else {

                        if (results[0].voted && results[0].voted.length>0) {
                            let check = false;
                            let count = 1;
                            let length = results[0].voted.length;
                            voted = results[0].voted
                            voted.map((x) => {
                                if (check == false) {
                                    if (x.voted == userId) {
                                        results[0].voted = true;
                                        results[0].poll[0].selectedTeamId = x.option
                                        check = true;
                                    } else
                                        if (count == length) {
                                            results[0].voted = false
                                        }
                                        else {
                                            count++
                                        }
                                }
                            })
                        } else {
                            results[0].voted = false
                        }
                        res.status(httpStatus.OK).json({
                            status: true,
                            statusCode: 200,
                            message: "success",
                            result: results.length == 0 ? [] : results[0],
                        });
                    }
                })
            } else {
                res.status(httpStatus.BAD_REQUEST).json({
                    status: false,
                    statusCode: 400,
                    message: text_settings['system.something_went_wrong']
                });
            }
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }

    this.getMatchSquardListing = (req, res) => {
        try {
            req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
            req.checkBody({
                "matchId": {
                    notEmpty: true,
                    errorMessage: text_settings["user.page_required"]
                }
            });
            let errors = commonUtility.parseValidation(req.validationErrors(), req);
            if (!errors) {
                let matchId = parseInt(req.body.matchId);
                let Match = db.collection("squardDetailForCricket");
                let filter = { 'matchId': matchId };
                Match.aggregate([
                    {
                        $match: filter
                    },
                    {
                        '$lookup': {
                            'from': 'players',
                            'localField': 'matchSquard.teama.squads.name',
                            'foreignField': 'name',
                            'as': 'playerDetail1'
                        }
                    },
                    {
                        '$lookup': {
                            'from': 'players',
                            'localField': 'matchSquard.teamb.squads.name',
                            'foreignField': 'name',
                            'as': 'playerDetail2'
                        }
                    },
                    {
                        $project: {
                            updatedAt: "$updatedAt",
                            _id: 0,
                            teamA: "$matchSquard.teama",
                            teamB: "$matchSquard.teamb",
                            teams: "$matchSquard.teams",
                            playerDetail1: 1,
                            playerDetail2: 1,
                        }
                    }
                ]).toArray((error, results) => {
                    if (error) {
                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                        });
                    } else if (results.length == 0) {
                        res.status(httpStatus.OK).json({
                            status: true,
                            statusCode: 200,
                            message: "success",
                            result: []
                        });
                    } else {
                        let squard = [];
                        squard = results[0];
                        let teamA = squard.teamA;
                        let teamB = squard.teamB;
                        let teams = squard.teams;
                        teamA.squads.forEach((x) => {
                            squard.playerDetail1.forEach((y) => {
                                if (x.name == y.name) {
                                    x.logo_url = y.img + ".png"
                                }
                            })
                        })
                        teamB.squads.forEach((x) => {
                            squard.playerDetail2.forEach((y) => {
                                if (x.name == y.name) {
                                    x.logo_url = y.img + ".png"
                                }
                            })
                        })
                        teams.forEach((x) => {
                            if (x.tid == teamA.team_id) {
                                teamA.teamName = x.title;
                            } else if (x.tid == teamB.team_id) {
                                teamB.teamName = x.title;
                            }
                        })
                        finalResult = {
                            teamA: teamA,
                            teamB: teamB
                        }
                        res.status(httpStatus.OK).json({
                            status: true,
                            statusCode: 200,
                            message: "success",
                            result: finalResult
                        });
                    }
                })
            } else {
                res.status(httpStatus.BAD_REQUEST).json({
                    status: false,
                    statusCode: 400,
                    message: text_settings['system.something_went_wrong']
                });
            }
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }

    this.getMatchScorecardListing = (req, res) => {
        try {
            req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
            req.checkBody({
                "matchId": {
                    notEmpty: true,
                    errorMessage: text_settings["user.page_required"]
                }
            });
            let errors = commonUtility.parseValidation(req.validationErrors(), req);
            if (!errors) {
                let matchId = parseInt(req.body.matchId);
                let Match = db.collection("scorecardDetailForCricket");
                let filter = { 'matchId': matchId };
                Match.aggregate([
                    {
                        $match: filter
                    },
                    {
                        $project: {
                            updatedAt: "$updatedAt",
                            _id: 0,
                            innings: "$scorecard.innings",
                            result: "$scorecard.status_note",
                        }
                    }
                ]).toArray((error, results) => {
                    if (error) {
                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                        });
                    } else if (results.length == 0) {
                        res.status(httpStatus.OK).json({
                            status: true,
                            statusCode: 200,
                            message: "success",
                            result: []
                        });
                    } else {
                        let result = results[0];
                        res.status(httpStatus.OK).json({
                            status: true,
                            statusCode: 200,
                            message: "success",
                            result: result,
                        });
                    }
                })
            } else {
                res.status(httpStatus.BAD_REQUEST).json({
                    status: false,
                    statusCode: 400,
                    message: text_settings['system.something_went_wrong']
                });
            }
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }

    this.getPlayerStats = (req, res) => {
        try {
            req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
            req.checkBody({
                "playerId": {
                    notEmpty: true,
                    errorMessage: text_settings["user.page_required"]
                }
            });
            let errors = commonUtility.parseValidation(req.validationErrors(), req);
            if (!errors) {
                let playerId = parseInt(req.body.playerId);
                let playerStats = db.collection("playerStats");
                let filter = { 'playerId': playerId };
                playerStats.aggregate([{
                    $match: filter
                },]).toArray((err,results) => {
                    res.status(httpStatus.OK).json({
                        status: true,
                        statusCode: 200,
                        message: "success",
                        result: results == null ? {} : results[0],
                    });
                })
            } else {
                res.status(httpStatus.BAD_REQUEST).json({
                    status: false,
                    statusCode: 400,
                    message: text_settings['system.something_went_wrong']
                });
            }
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }
    this.getInternationalTeams = (req, res) => {
        try {
            let teams = db.collection("teams");
            teams.aggregate([{ $project: { _id: 0, team: "$items.team"} }]).toArray((err, results) => {
                let mensTeams=[];
                let iplTeam=[];
                let womensTeams=[];
                results.map((x)=>{
                    if(internationalMensTeams.indexOf(x.team.tid)!= -1){
                        mensTeams.push(x);
                    }else if(iplTeams.indexOf(x.team.tid)!= -1){
                        iplTeam.push(x);
                    }else{
                        womensTeams.push(x)
                    }
                })
                let leagueTeamArray=[]
                let leagueTeams={
                    name:"IPL",
                    LeagueTeam:iplTeam
                }
                leagueTeamArray.push(leagueTeams)
                let finalResult={
                    mensTeams:mensTeams,
                    womensTeams:womensTeams,
                    leagueTeams:leagueTeamArray
                }
                res.status(httpStatus.OK).json({
                    status: true,
                    statusCode: 200,
                    message: "success",
                    result: finalResult,
                });
            })
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }
    this.getTeamPlayer = (req, res) => {
        try {
            let teamId=req.body.teamId;
            let teams = db.collection("teams");
            teams.aggregate([{$match:{teamId:teamId}},{ $project: { _id: 0, players: "$items.players" } }]).toArray((err, results) => {
                let bating=[];
                let bowling=[];
                let wicket=[];
                let allRounder=[];

                results[0].players.map((x)=>{
                    if(x.playing_role=="bat"){
                        bating.push(x);
                    }else if(x.playing_role=="bowl"){
                        bowling.push(x);
                    }else if(x.playing_role=="wk"){
                        wicket.push(x);
                    }else if(x.playing_role=="all"){
                        allRounder.push(x);
                    }else if(x.playing_role=="wkbat"){
                        wicket.push(x);
                        bating.push(x);
                    }
                })
                let finalResult={
                    bating:bating,
                    bowling:bowling,
                    wicket:wicket,
                    allRounder:allRounder
                }
                res.status(httpStatus.OK).json({
                    status: true,
                    statusCode: 200,
                    message: "success",
                    result: finalResult,
                });
            })
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }
}

module.exports = new Mobile();
