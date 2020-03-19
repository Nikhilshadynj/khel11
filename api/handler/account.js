const httpStatus = require('http-status');
const globals = require('../../global_constant');
const commonUtility = require("../helpers/commonUtility");
const ObjectId = require('mongodb').ObjectID;
var async = require("async");
let crypto = require('crypto');
const config = require('../../config/config').storageConfig;
const http = require('http')
const moment = require('moment-timezone');
const request = require('request')

function Account() {

    /**function to user signup 
         * req parameters - phone, email,name
        */
    this.signUp = (req, res) => {
        try {
            commonUtility.isPost(req, res, function (isPost) {
                if (isPost) {
                    req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                    req.checkBody({
                        "phone": {
                            notEmpty: true,
                            isNumeric: true,
                            isLength: { options: [10, 10] },
                            errorMessage: text_settings["user.phone_required"]
                        },
                        "name": {
                            notEmpty: true,
                            isLength: { options: [1, 50] },
                            errorMessage: text_settings["user.email_required"]
                        }
                    });
                    var errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        let phone = req.body.phone;
                        let email = req.body.email == undefined ? "" : req.body.email;
                        let isOffers = req.body.isOffers == undefined ? false : JSON.parse(req.body.isOffers);
                        let signupType = req.body.signupType == undefined ? 1 : req.body.signupType;
                        let name = req.body.name;
                        let refCodeFromUser = req.body.refCodeFromUser == undefined ? "" : req.body.refCodeFromUser;
                        let refferalCodeUniqueNumber = commonUtility.getRandomOtp();
                        let refferalcodeUniqueString = name.substring(0, 3);
                        let refferalCode = refferalcodeUniqueString + refferalCodeUniqueNumber;
                        let Users = db.collection("users");
                        Users.findOne({
                            'phone': phone
                        }).then(user => {
                            if (user !== null) {
                                if (user.isOtpVerified) {
                                    res.status(httpStatus.OK).json({
                                        status: false,
                                        statusCode: 200,
                                        message: text_settings["user.already_exists"]
                                    })
                                } else {
                                    sendOtp(phone).then(otp => {
                                        res.status(httpStatus.OK).json({
                                            status: true,
                                            statusCode: 200,
                                            result: {
                                                userId: user._id,
                                                message: text_settings["user.please_verify_otp"]
                                            }
                                        })
                                    }).catch(errMessage => {
                                        res.status(httpStatus.OK).json({
                                            status: false,
                                            statusCode: 500,
                                            message: text_settings['system.something_went_wrong']
                                        })
                                    });
                                }
                            } else {
                                let addUser = {
                                    name: name,
                                    email: email,
                                    phone: phone,
                                    userType: globals.UserType.EndUser,
                                    refCodeFromUser: refCodeFromUser,
                                    refferalCode: refferalCode,
                                    reffered: [],
                                    contestCount: 1,
                                    isOffers: isOffers,
                                    signupType: parseInt(signupType),
                                    isOtpVerified: false,
                                    isActive: true,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                };
                                Users.insertOne(addUser).then(result => {
                                    sendOtp(phone).then(otp => {
                                        Users.findOneAndUpdate(
                                            { refferalCode: refCodeFromUser, isActive: true },
                                            {
                                                $push: {
                                                    reffered: result.ops[0]._id
                                                },
                                                $inc: { contestCount: 1 }
                                            },
                                            { returnOriginal: false }).then(result1 => {
                                            }).catch(error => {
                                            });
                                        res.status(httpStatus.OK).json({
                                            status: true,
                                            statusCode: 200,
                                            message: "success",
                                            result: {
                                                userId: result.ops[0]._id,
                                                message: text_settings["user.please_verify_otp"]
                                            }
                                        })
                                    }).catch(errMessage => {
                                        res.status(httpStatus.OK).json({
                                            status: false,
                                            statusCode: 500,
                                            message: text_settings['system.something_went_wrong']
                                        })
                                    });
                                }).catch(err => {
                                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                        status: false,
                                        statusCode: 500,
                                        message: text_settings['system.something_went_wrong']
                                    })
                                })
                            }
                        }).catch(error => {
                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.something_went_wrong']
                            })
                        });
                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                        })
                    }
                } else {
                    res.status(httpStatus.BAD_REQUEST).json({
                        status: false,
                        statusCode: 400,
                        message: text_settings['system.Please_send_data_using_post_method'],
                    })
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            })
        }
    }

    /**
         * function to send OTP
         */
    function sendOtp(phone) {
        return new Promise((resolve, reject) => {
            try {
                var otp = commonUtility.getRandomOtp();
                // var otp = "123456";
                if (phone == "1234567890" || phone == 1234567890) {
                    otp = "985632";
                }
                let message = otp + " " + text_settings["system.otp_sms"];
                let Otps = db.collection("otps");
                if (otp !== "") {
                    //check first mobile number exist
                    Otps.findOne({ 'phone': phone, 'otpStatus': 0 }).then(response => {
                        if (response !== null) {
                            // Only send SMS => after 60 seconds
                            let dateNow = moment(Date.now());
                            let otpExpiredDate = moment(response.createdAt).add(60, 's');
                            if (otpExpiredDate._d < dateNow._d) {
                                sendSms(message, otp, phone).then(res => {
                                    Otps.updateMany({ 'phone': phone }, { $set: { 'otpStatus': 1, 'updatedAt': new Date() } }).then(updatestatus => {
                                        let addOtp = {
                                            otp: otp.toString(),
                                            phone: phone,
                                            otpStatus: 0,
                                            createdAt: new Date(),
                                            updatedAt: new Date()
                                        };
                                        Otps.insertOne(addOtp).then(result => {
                                            resolve(otp);
                                        }).catch(er => {
                                            reject("Database Error");
                                        });
                                    }).catch(err => {
                                        reject("Database Error");
                                    });
                                }).catch(error => {
                                    reject(error);
                                });
                            } else {
                                var seconds = (otpExpiredDate._d.getTime() - dateNow._d.getTime()) / 1000;
                                reject(`Please try after ${parseInt(seconds)} seconds`);
                            }
                        } else {
                            sendSms(message, otp, phone).then(res => {
                                let addOtp = {
                                    otp: otp.toString(),
                                    phone: phone,
                                    otpStatus: 0,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                };
                                Otps.insertOne(addOtp).then(result => {
                                    resolve(otp);
                                }).catch(er => {
                                    reject("Database Error");
                                });
                            }).catch(error => {
                                reject(error);
                            });
                        }
                    }).catch(err => {
                        reject("Database Error");
                    });
                }
                else {
                    reject('OTP error');
                }
            } catch (ex) {
                reject("Server Error");
            }
        });
    }

    function sendSms(message, otp, phone) {
        return new Promise((resolve, reject) => {
            request.get(`http://world.msg91.com/api/otp.php?authkey=${config.smsAuthKey}&mobile=${config.smsCountryCode}${phone}&message=${message}&sender=${config.smsSenderId}&otp=${otp}`, function (err, res) {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    console.log(res.body);
                    resolve(res.body);
                }
            })
        });
    }

    /**function to verify otp at signup
     * req parameters - otp , userId, type
    */
   this.verifyOtp = (req, res) => {
    try {
        commonUtility.isPost(req, res, function (isPost) {
            if (isPost) {
                req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                req.checkBody({
                    "userId": {
                        notEmpty: true,
                        isAlphanumeric: true,
                        isLength: { options: [24, 24] },
                        errorMessage: text_settings["user.userid_required"]
                    },
                    "otp": {
                        notEmpty: true,
                        isNumeric: true,
                        isLength: { options: [4, 4] },
                        errorMessage: text_settings["user.otp_required"]
                    },
                    "type": {
                        notEmpty: true,
                        isNumeric: true,
                        isLength: { options: [1, 1] },
                        errorMessage: text_settings["user.verifyOtpType_required"]
                    },
                });
                var errors = commonUtility.parseValidation(req.validationErrors(), req);
                if (!errors) {
                    let userId = req.body.userId;
                    let otp = req.body.otp;
                    let verifyOtpType = req.body.type;
                    let Users = db.collection("users");
                    let Otps = db.collection("otps");
                    let ValidateLogins = db.collection("validatelogins");
                    Users.findOne({ '_id': ObjectId(userId) }).then(response => {
                        if (response === null) {
                            res.status(httpStatus.OK).json({
                                status: false,
                                statusCode: 200,
                                message: text_settings["user.not_found"]
                            })
                        } else {
                            // Verify OTP at the time of signin
                            if (verifyOtpType == globals.VerifyOtpType.SignIn) {
                                if (!response.isOtpVerified) {
                                    Otps.findOne({ 'phone': response.phone, 'otpStatus': 0 }).then(otpData => {
                                        if (otpData === null) {
                                            res.status(httpStatus.OK).json({
                                                status: false,
                                                statusCode: 200,
                                                message: text_settings["user.otp_not_found"]
                                            })
                                        } else {
                                            if (otpData.otp != otp) {
                                                res.status(httpStatus.OK).json({
                                                    status: false,
                                                    statusCode: 200,
                                                    message: text_settings["user.otp_not_valid"]
                                                })
                                            } else {
                                                let dateNow = moment(Date.now());
                                                let otpExpiredDate = moment(otpData.createdAt).add(2, 'h');
                                                if (otpExpiredDate._d > dateNow._d) {
                                                    Otps.findOneAndUpdate(
                                                        { 'phone': response.phone, 'otp': parseInt(otp), 'otpStatus': 0 },
                                                        {
                                                            '$set': { 'otpStatus': 1, 'updatedAt': new Date() }
                                                        }).then(updateStatus => {
                                                            Users.findOneAndUpdate(
                                                                { '_id': ObjectId(userId), 'isOtpVerified': false },
                                                                { '$set': { 'isOtpVerified': true } },
                                                                { returnOriginal: false }
                                                            ).then(otpVerifiedStatus => {
                                                                var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                                                                getValidateLogin(ip, userId, response.userType).then(validateLogin => {
                                                                    ValidateLogins.insertOne(validateLogin).then(validateLoginResponse => {
                                                                        res.status(httpStatus.OK).json({
                                                                            status: true,
                                                                            statusCode: 200,
                                                                            message: "success",
                                                                            result: {
                                                                                userId: response._id,
                                                                                name: (response.name) ? response.name : "",
                                                                                userType: response.userType,
                                                                                message: text_settings["user.otp_verified"],
                                                                                authToken: validateLogin.token
                                                                            }
                                                                        });
                                                                    }).catch(validateLoginErr => {
                                                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                            status: false,
                                                                            statusCode: 500,
                                                                            message: text_settings['system.something_went_wrong']
                                                                            // error: validateLoginErr.message
                                                                        });
                                                                    });
                                                                }).catch(validateLoginError => {
                                                                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                        status: false,
                                                                        statusCode: 500,
                                                                        message: text_settings['system.something_went_wrong']
                                                                        // error: validateLoginError.message
                                                                    });
                                                                });
                                                            }).catch(otpVerifiedErr => {
                                                                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                    status: false,
                                                                    statusCode: 500,
                                                                    message: text_settings['system.something_went_wrong']
                                                                    // error: otpVerifiedErr.message
                                                                });
                                                            });
                                                        }).catch(err => {
                                                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                status: false,
                                                                statusCode: 500,
                                                                message: text_settings['system.something_went_wrong']
                                                                // error: err.message
                                                            });
                                                        });
                                                } else {
                                                    res.status(httpStatus.OK).json({
                                                        status: false,
                                                        statusCode: 500,
                                                        message: text_settings["user.otp_expired"]
                                                    });
                                                }
                                            }
                                        }
                                    }).catch(otpErr => {
                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                            status: false,
                                            statusCode: 500,
                                            message: text_settings['system.something_went_wrong']
                                            // error: otpErr.message
                                        });
                                    });
                                } else {
                                    Otps.findOne({ 'phone': response.phone, 'otpStatus': 0 }).then(otpData => {
                                        if (otpData === null) {
                                            res.status(httpStatus.OK).json({
                                                status: false,
                                                statusCode: 200,
                                                message: text_settings["user.otp_not_found"]
                                            });
                                        } else {
                                            if (otpData.otp != otp) {
                                                res.status(httpStatus.OK).json({
                                                    status: false,
                                                    statusCode: 200,
                                                    message: text_settings["user.otp_not_valid"]
                                                });
                                            } else {
                                                let dateNow = moment(Date.now());
                                                let otpExpiredDate = moment(otpData.createdAt).add(2, 'h');
                                                if (otpExpiredDate._d > dateNow._d) {
                                                    Otps.findOneAndUpdate({ phone: response.phone, otp: parseInt(otp), otpStatus: 0 }, { '$set': { 'otpStatus': 1, 'updatedAt': new Date() } }).then(updateStatus => {
                                                        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                                                        getValidateLogin(ip, userId, response.userType).then(validateLogin => {
                                                            //disable session for previously signed in devices for same device id and make new entry for new session
                                                            ValidateLogins.findOneAndUpdate(
                                                                { $and: [{ 'userId': ObjectId(userId) }, { 'isActive': true }] },
                                                                {
                                                                    $set: { 'isActive': false, 'updatedAt': new Date() }
                                                                }).then(logoutResult => {
                                                                    ValidateLogins.insertOne(validateLogin).then(validateLoginResponse => {
                                                                        res.status(httpStatus.OK).json({
                                                                            status: true,
                                                                            statusCode: 200,
                                                                            message: "success",
                                                                            result: {
                                                                                userId: response._id,
                                                                                name: (response.name) ? response.name : "",
                                                                                userType: response.userType,
                                                                                message: text_settings["user.login_succeeded"],
                                                                                authToken: validateLogin.token
                                                                            }
                                                                        });
                                                                    }).catch(validateLoginErr => {
                                                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                            status: false,
                                                                            statusCode: 500,
                                                                            message: text_settings['system.something_went_wrong']
                                                                            // error: validateLoginErr.message
                                                                        });
                                                                    });
                                                                }).catch(logoutError => {
                                                                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                        status: false,
                                                                        statusCode: 500,
                                                                        message: text_settings['system.something_went_wrong']
                                                                        // error: logoutError.message
                                                                    });
                                                                });
                                                        }).catch(validateLoginError => {
                                                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                status: false,
                                                                statusCode: 500,
                                                                message: text_settings['system.something_went_wrong']
                                                                // error: validateLoginError.message
                                                            });
                                                        });
                                                    }).catch(err => {
                                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                            status: false,
                                                            statusCode: 500,
                                                            message: text_settings['system.something_went_wrong']
                                                            // error: err.message
                                                        });
                                                    });
                                                } else {
                                                    res.status(httpStatus.OK).json({
                                                        status: false,
                                                        statusCode: 500,
                                                        message: text_settings["user.otp_expired"]
                                                    });
                                                }
                                            }
                                        }
                                    }).catch(otpErr => {
                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                            status: false,
                                            statusCode: 500,
                                            message: text_settings['system.something_went_wrong']
                                            // error: otpErr.message
                                        });
                                    });
                                }
                            } else {
                                // Verify OTP at the time of signup
                                if (response.isOtpVerified) {
                                    res.status(httpStatus.OK).json({
                                        status: false,
                                        statusCode: 200,
                                        message: text_settings["user.otp_already_verified"]
                                    });
                                } else {
                                    Otps.findOne({ 'phone': response.phone, 'otpStatus': 0 }).then(otpData => {
                                        if (otpData === null) {
                                            res.status(httpStatus.OK).json({
                                                status: false,
                                                statusCode: 200,
                                                message: text_settings["user.otp_not_found"]
                                            })
                                        } else {
                                            if (otpData.otp != otp) {
                                                res.status(httpStatus.OK).json({
                                                    status: false,
                                                    statusCode: 200,
                                                    message: text_settings["user.otp_not_valid"]
                                                })
                                            } else {
                                                let dateNow = moment(Date.now());
                                                let otpExpiredDate = moment(otpData.createdAt).add(2, 'h');
                                                if (otpExpiredDate._d > dateNow._d) {
                                                    Otps.findOneAndUpdate(
                                                        { 'phone': response.phone, 'otp': parseInt(otp), 'otpStatus': 0 },
                                                        {
                                                            '$set': { 'otpStatus': 1, 'updatedAt': new Date() }
                                                        }).then(updateStatus => {
                                                            Users.findOneAndUpdate(
                                                                { '_id': ObjectId(userId), 'isOtpVerified': false },
                                                                { '$set': { 'isOtpVerified': true } },
                                                                { returnOriginal: false }
                                                            ).then(otpVerifiedStatus => {
                                                                var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                                                                getValidateLogin(ip, userId, response.userType).then(validateLogin => {
                                                                    ValidateLogins.insertOne(validateLogin).then(validateLoginResponse => {
                                                                        res.status(httpStatus.OK).json({
                                                                            status: true,
                                                                            statusCode: 200,
                                                                            message: "success",
                                                                            result: {
                                                                                userId: response._id,
                                                                                name: (response.name) ? response.name : "",
                                                                                userType: response.userType,
                                                                                message: text_settings["user.otp_verified"],
                                                                                authToken: validateLogin.token
                                                                            }
                                                                        });
                                                                    }).catch(validateLoginErr => {
                                                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                            status: false,
                                                                            statusCode: 500,
                                                                            message: text_settings['system.something_went_wrong']
                                                                            // error: validateLoginErr.message
                                                                        });
                                                                    });
                                                                }).catch(validateLoginError => {
                                                                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                        status: false,
                                                                        statusCode: 500,
                                                                        message: text_settings['system.something_went_wrong']
                                                                        // error: validateLoginError.message
                                                                    });
                                                                });
                                                            }).catch(otpVerifiedErr => {
                                                                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                    status: false,
                                                                    statusCode: 500,
                                                                    message: text_settings['system.something_went_wrong']
                                                                    // error: otpVerifiedErr.message
                                                                });
                                                            });
                                                        }).catch(err => {
                                                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                status: false,
                                                                statusCode: 500,
                                                                message: text_settings['system.something_went_wrong']
                                                                // error: err.message
                                                            });
                                                        });
                                                } else {
                                                    res.status(httpStatus.OK).json({
                                                        status: false,
                                                        statusCode: 500,
                                                        message: text_settings["user.otp_expired"]
                                                    });
                                                }
                                            }
                                        }
                                    }).catch(otpErr => {
                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                            status: false,
                                            statusCode: 500,
                                            message: text_settings['system.something_went_wrong']
                                            // error: otpErr.message
                                        });
                                    });
                                }
                            }

                        }
                    }).catch(error => {
                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                            // error: error.message
                        })
                    })
                } else {
                    res.status(httpStatus.BAD_REQUEST).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.something_went_wrong']
                        // error: errors
                    })
                }
            } else {
                res.status(httpStatus.BAD_REQUEST).json({
                    status: false,
                    statusCode: 500,
                    message: text_settings['system.Please_send_data_using_post_method'],
                })
            }
        });
    } catch (ex) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            status: false,
            statusCode: 500,
            message: text_settings['system.something_went_wrong']
            // error: ex.message
        })
    }
}

    /**function to resend otp 
    * req parameters - userId
    */
    this.resendOtp = (req, res) => {
        try {
            var userId = req.body.userId || "";
            let Users = db.collection("users");
            commonUtility.isPost(req, res, function (isPost) {
                if (isPost) {
                    req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                    req.checkBody({
                        "userId": {
                            notEmpty: true,
                            isAlphanumeric: true,
                            isLength: { options: [24, 24] },
                            errorMessage: text_settings["user.userid_required"]
                        }
                    });
                    var errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        let data = req.body.data || "";
                        Users.findOne({ '_id': ObjectId(userId) }).then(response => {
                            if (response === null) {
                                res.status(httpStatus.OK).json({
                                    status: false,
                                    statusCode: 200,
                                    message: text_settings["user.not_found"]
                                });
                            } else {
                                let phone = (data === "") ? response.phone : data;
                                sendOtp(phone).then(otp => {
                                    res.status(httpStatus.OK).json({
                                        status: true,
                                        statusCode: 200,
                                        message: "success",
                                        result: {
                                            userId: userId,
                                            message: text_settings["user.resend_otp"]
                                        }
                                    });
                                }).catch(errMessage => {
                                    res.status(httpStatus.OK).json({
                                        status: false,
                                        statusCode: 500,
                                        message: errMessage
                                    });
                                });
                            }
                        }).catch(error => {
                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.something_went_wrong']
                                // error: error.message
                            });
                        })
                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            // error: errors
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                        });
                    }
                } else {
                    res.status(httpStatus.BAD_REQUEST).json({
                        status: false,
                        // error: errors
                        statusCode: 500,
                        message: text_settings['system.something_went_wrong']
                    });
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                // error: ex.message
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }

    /**function to signin user 
    * req parameters - phone
    */
    this.signIn = (req, res) => {
        try {
            let phone = req.body.phone;
            let Users = db.collection("users");
            commonUtility.isPost(req, res, function (isPost) {
                if (isPost) {
                    req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                    req.checkBody({
                        "phone": {
                            notEmpty: true,
                            isNumeric: true,
                            isLength: { options: [10, 10] },
                            errorMessage: text_settings["user.phone_required"]
                        }
                    });
                    var errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        Users.findOne({ 'phone': phone, 'isActive': true }).then(response => {
                            if (response === null) {
                                res.status(httpStatus.OK).json({
                                    status: false,
                                    statusCode: 200,
                                    message: text_settings["user.not_registered"]
                                })
                            } else {
                                if (!response.isOtpVerified) {
                                    sendOtp(phone).then(otp => {
                                        res.status(httpStatus.OK).json({
                                            status: true,
                                            statusCode: 200,
                                            message: "success",
                                            result: {
                                                userId: response._id,
                                                message: text_settings["user.please_verify_otp"]
                                            }
                                        });
                                    }).catch(errMessage => {
                                        res.status(httpStatus.OK).json({
                                            status: false,
                                            statusCode: 500,
                                            message: errMessage
                                        });
                                    });
                                } else {
                                    sendOtp(phone).then(otp => {
                                        res.status(httpStatus.OK).json({
                                            status: true,
                                            statusCode: 200,
                                            message: "success",
                                            result: {
                                                userId: response._id,
                                                message: text_settings["user.resend_otp"]
                                            }
                                        });
                                    }).catch(errMessage => {
                                        res.status(httpStatus.OK).json({
                                            status: false,
                                            statusCode: 500,
                                            message: errMessage
                                        });
                                    });
                                }
                            }
                        }).catch(error => {
                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.something_went_wrong']
                                // error: error.message
                            })
                        })
                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                            // error: errors
                        })
                    }
                } else {
                    res.status(httpStatus.BAD_REQUEST).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.Please_send_data_using_post_method'],
                    })
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
                // error: ex.message
            })
        }
    }
    /**function to update user profile by id
        * req parameters - firstName, avatarId, bio
        */
    this.getUserProfile = function (req, res) {
        try {
            commonUtility.validateUser(req, res, (validateUser) => {
                if (validateUser.status) {
                    let Users = db.collection('users');

                    var errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        let userId = validateUser.userId;

                        Users.findOne(
                            { _id: ObjectId(userId), isActive: true },
                            { returnOriginal: false }).then(result => {
                                if (result.value !== null) {
                                    res.status(httpStatus.OK).json({
                                        status: true,
                                        statusCode: 200,
                                        message: "success",
                                        result: {
                                            userId: result._id,
                                            name: result.name,
                                            dateOfBirth: result.dateOfBirth || "",
                                            address: result.address || "",
                                            email: result.email,
                                            phone: result.phone,
                                            refferalCode: result.refferalCode,
                                            createdAt: result.createdAt,
                                            contestCount: result.contestCount,
                                            isOffers: result.isOffers
                                        }
                                    });
                                } else {
                                    res.status(httpStatus.OK).json({
                                        status: false,
                                        statusCode: 200,
                                        message: text_settings["user.blocked"]
                                    });
                                }
                            }).catch(error => {
                                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                    status: false,
                                    statusCode: 500,
                                    message: text_settings['system.something_went_wrong']
                                    // error: error.message
                                });
                            });

                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                            // error: errors
                        });
                    }

                } else {
                    res.status(validateUser.statusCode).json({
                        status: false,
                        statusCode: 403,
                        message: text_settings['system.unauthorized']
                        // error: validateUser.error
                    })
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
                // error: ex.message
            })
        }
    }
    /**function to update user profile by id
    * req parameters - firstName, avatarId, bio
    */
    this.updateUserProfile = function (req, res) {
        try {
            commonUtility.validateUser(req, res, (validateUser) => {
                if (validateUser.status) {
                    let Users = db.collection('users');
                    commonUtility.isPost(req, res, function (isPost) {
                        if (isPost) {
                            req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                            req.checkBody({
                                "name": {
                                    notEmpty: true,
                                    errorMessage: text_settings["user.username_required"],
                                }
                            });
                            var errors = commonUtility.parseValidation(req.validationErrors(), req);
                            if (!errors) {
                                let userId = validateUser.userId;
                                let name = req.body.name || "";
                                let dateOfBirth = req.body.dateOfBirth || "";
                                let address = req.body.address || "";
                                let email = req.body.email || "";
                                let isOffers = JSON.parse(req.body.isOffers) || false;

                                Users.findOneAndUpdate(
                                    { _id: ObjectId(userId), isActive: true },
                                    {
                                        $set: {
                                            name: name,
                                            dateOfBirth: dateOfBirth,
                                            address: address,
                                            email: email,
                                            isOffers: isOffers
                                        }
                                    },
                                    { returnOriginal: false }).then(result => {
                                        if (result.value !== null) {
                                            res.status(httpStatus.OK).json({
                                                status: true,
                                                statusCode: 200,
                                                message: text_settings['user.profile_updated'],

                                            });
                                        } else {
                                            res.status(httpStatus.OK).json({
                                                status: false,
                                                statusCode: 200,
                                                message: text_settings["user.blocked"]
                                            });
                                        }
                                    }).catch(error => {
                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                            status: false,
                                            statusCode: 500,
                                            message: text_settings['system.something_went_wrong']
                                            // error: error.message
                                        });
                                    });

                            } else {
                                res.status(httpStatus.BAD_REQUEST).json({
                                    status: false,
                                    statusCode: 500,
                                    message: text_settings['system.something_went_wrong']
                                    // error: errors
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
                } else {
                    res.status(validateUser.statusCode).json({
                        status: false,
                        statusCode: 401,
                        message: text_settings['system.unauthorized']
                        // error: validateUser.error
                    })
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
                // error: ex.message
            })
        }
    }

    /**function to logout
    * req parameters - 
    */
   this.logout = function (req, res) {
    try {
        commonUtility.validateUser(req, res, (validateUser) => {
            let ValidateLogins = db.collection("validatelogins");
            ValidateLogins.findOneAndUpdate(
                { $and: [{ 'userId': ObjectId(validateUser.userId) }, { 'deviceId': validateUser.deviceId }, { 'isActive': true }] },
                {
                    $set: { 'isActive': false, 'updatedAt': new Date() }
                }).then(result => {
                    res.status(httpStatus.OK).json({
                        status: true,
                        statusCode: 200,
                        message: "success",
                        result: {
                            message: text_settings['user.logout']
                        }
                    })
                }).catch(error => {
                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.something_went_wrong']
                        // error: error.message
                    })
                });
        });
    } catch (ex) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            status: false,
            statusCode: 500,
            message: text_settings['system.something_went_wrong']
            // error: ex.message
        })
    }
}


    /**function for social login
    * req parameters - providerType, providerKey, deviceId, deviceToken, deviceType, appVersion, osVersion
    */
    this.socialLogin = function (req, res) {
        try {
            let Users = db.collection('users');
            let ValidateLogins = db.collection('validatelogins');
            commonUtility.isPost(req, res, function (isPost) {
                if (isPost) {
                    req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                    req.checkBody({
                        "providerKey": {
                            notEmpty: true,
                            errorMessage: text_settings["user.providerKey_required"],
                        },
                        "providerType": {
                            notEmpty: true,
                            isNumeric: true,
                            isLength: { options: [1, 1] },
                            errorMessage: text_settings["user.providerType_required"],
                        }
                    });
                    var errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        let providerKey = req.body.providerKey;
                        let signupType = req.body.providerType;
                        let name = req.body.name || "";
                        let email = req.body.email || "";
                        let isOffers = req.body.isOffers == undefined ? false : JSON.parse(req.body.isOffers);
                        let refCodeFromUser = req.body.refCodeFromUser == undefined ? "" : req.body.refCodeFromUser;
                        let refferalCodeUniqueNumber = commonUtility.getRandomOtp();
                        let refferalcodeUniqueString = name.substring(0, 3);
                        let refferalCode = refferalcodeUniqueString + refferalCodeUniqueNumber;
                        let phone = req.body.phone || "";
                        Users.findOne({ 'providerKey': providerKey }).then(response => {
                            if (response === null) {
                                let addUser = {
                                    name: name,
                                    email: email,
                                    phone: phone,
                                    providerKey: providerKey,
                                    isOffers: isOffers,
                                    userType: globals.UserType.EndUser,
                                    refCodeFromUser: refCodeFromUser,
                                    refferalCode: refferalCode,
                                    reffered: [],
                                    contestCount: 1,
                                    isOtpVerified: false,
                                    signupType: parseInt(signupType),
                                    isActive: true,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                };
                                Users.insertOne(addUser).then(result => {
                                    Users.findOneAndUpdate(
                                        { refferalCode: refCodeFromUser, isActive: true },
                                        {
                                            $push: {
                                                reffered: result.ops[0]._id
                                            },
                                            $inc: { contestCount: 1 }
                                        },
                                        { returnOriginal: false }).then(result1 => {
                                        }).catch(error => {
                                        });
                                    res.status(httpStatus.OK).json({
                                        status: true,
                                        statusCode: 200,
                                        message: "success",
                                        result: {
                                            userId: result.ops[0]._id,
                                            name: result.ops[0].name,
                                            phone: result.ops[0].phone,
                                            isOtpVerified: false,
                                            userType: result.ops[0].userType,
                                            message: text_settings["user.add_phone"],
                                            authToken: ""
                                        }
                                    });
                                }).catch(err => {
                                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                        status: false,
                                        statusCode: 500,
                                        message: text_settings['system.something_went_wrong']
                                        // error: err.message
                                    });
                                })
                            } else {
                                if (!response.isOtpVerified) {
                                    let message = (response.phone === "") ? text_settings["user.add_phone"] : text_settings["user.verify_otp"]
                                    if (response.phone === "") {
                                        res.status(httpStatus.OK).json({
                                            status: true,
                                            statusCode: 200,
                                            message: "success",
                                            result: {
                                                userId: response._id,
                                                name: response.firstName,
                                                phone: response.phone,
                                                isOtpVerified: false,
                                                userType: response.userType,
                                                message: message,
                                                authToken: ""
                                            }
                                        });
                                    } else {
                                        sendOtp(response.phone).then(otp => {
                                            res.status(httpStatus.OK).json({
                                                status: true,
                                                statusCode: 200,
                                                message: "success",
                                                result: {
                                                    userId: response._id,
                                                    name: response.firstName,
                                                    phone: response.phone,
                                                    isOtpVerified: false,
                                                    profileType: response.profileType,
                                                    userType: response.userType,
                                                    message: message,
                                                    authToken: ""
                                                }
                                            });
                                        }).catch(errMessage => {
                                            res.status(httpStatus.OK).json({
                                                status: false,
                                                statusCode: 500,
                                                message: errMessage
                                            });
                                        });
                                    }
                                } else {
                                    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                                    getValidateLogin(ip, response._id, response.userType).then(validateLogin => {
                                        //disable session for previously signed in devices for same device id and make new entry for new session
                                        ValidateLogins.findOneAndUpdate(
                                            { $and: [{ 'userId': ObjectId(response._id) }, { 'isActive': true }] },
                                            {
                                                $set: { 'isActive': false, 'updatedAt': new Date() }
                                            }).then(logoutResult => {
                                                ValidateLogins.insertOne(validateLogin).then(validateLoginResponse => {
                                                    res.status(httpStatus.OK).json({
                                                        status: true,
                                                        statusCode: 200,
                                                        message: "success",
                                                        result: {
                                                            userId: response._id,
                                                            name: response.name,
                                                            phone: response.phone,
                                                            isOtpVerified: response.isOtpVerified,
                                                            userType: response.userType,
                                                            message: text_settings["user.login_succeeded"],
                                                            authToken: validateLogin.token
                                                        }
                                                    });
                                                }).catch(validateLoginErr => {
                                                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                        status: false,
                                                        statusCode: 500,
                                                        message: text_settings['system.something_went_wrong']
                                                        // error: validateLoginErr.message
                                                    });
                                                });
                                            }).catch(logoutError => {
                                                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                    status: false,
                                                    statusCode: 500,
                                                    message: text_settings['system.something_went_wrong']
                                                    // error: logoutError.message
                                                });
                                            });
                                    }).catch(validateLoginError => {
                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                            status: false,
                                            statusCode: 500,
                                            message: text_settings['system.something_went_wrong']
                                            // error: validateLoginError.message
                                        });
                                    });
                                }
                            }
                        }).catch(error => {
                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.something_went_wrong']
                                // error: error.message
                            });
                        })
                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                            // error: errors
                        });
                    }
                } else {
                    res.status(httpStatus.BAD_REQUEST).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.Please_send_data_using_post_method'],
                    });
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
                // error: ex.message
            });
        }
    }


    /**function for add phone number
    * req parameters - userId, phoneNumber
    */
    this.addPhoneSocialLogin = function (req, res) {
        try {
            commonUtility.isPost(req, res, function (isPost) {
                if (isPost) {
                    req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                    req.checkBody({
                        "userId": {
                            notEmpty: true,
                            isAlphanumeric: true,
                            isLength: { options: [24, 24] },
                            errorMessage: text_settings["user.userid_required"]
                        },
                        "phone": {
                            notEmpty: true,
                            isNumeric: true,
                            isLength: { options: [10, 10] },
                            errorMessage: text_settings["user.phone_required"]
                        }
                    });
                    var errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        let phone = req.body.phone;
                        let userId = req.body.userId;
                        let refCodeFromUser = req.body.refCodeFromUser == undefined ? "" : req.body.refCodeFromUser;
                        let Users = db.collection("users");
                        Users.findOne({ '_id': ObjectId(userId), isOtpVerified: false }).then(user => {
                            if (user !== null) {
                                //check phone number is exist or not
                                Users.findOne({ 'phone': phone }).then(result => {
                                    if (result !== null) {
                                        if (result.isOtpVerified) {
                                            res.status(httpStatus.OK).json({
                                                status: false,
                                                statusCode: 200,
                                                message: text_settings["user.phone_already_exists"]
                                            })
                                        } else {
                                            sendOtp(phone).then(otp => {
                                                if (refCodeFromUser != "") {
                                                    Users.findOneAndUpdate(
                                                        { refferalCode: refCodeFromUser, isActive: true },
                                                        {
                                                            $push: {
                                                                reffered: ObjectId(userId)
                                                            },
                                                            $inc: { contestCount: 1 }
                                                        },
                                                        { returnOriginal: false }).then(result1 => {
                                                        }).catch(error => {
                                                        });
                                                    Users.findOneAndUpdate(
                                                        { '_id': ObjectId(userId), isActive: true },
                                                        {
                                                            $set: {
                                                                refCodeFromUser: refCodeFromUser
                                                            }
                                                        },
                                                        { returnOriginal: false }).then(result1 => {
                                                        }).catch(error => {
                                                        });
                                                }
                                                res.status(httpStatus.OK).json({
                                                    status: true,
                                                    statusCode: 200,
                                                    message: "success",
                                                    result: {
                                                        userId: user._id,
                                                        message: text_settings["user.please_verify_otp"]
                                                    }
                                                })
                                            }).catch(errMessage => {
                                                res.status(httpStatus.OK).json({
                                                    status: false,
                                                    statusCode: 500,
                                                    message: errMessage
                                                });
                                            });
                                        }
                                    } else {
                                        Users.findOneAndUpdate(
                                            { '_id': ObjectId(userId), 'isOtpVerified': false },
                                            { $set: { 'phone': phone } },
                                            { returnOriginal: false }
                                        ).then(response => {
                                            sendOtp(phone).then(otp => {
                                                if (refCodeFromUser != "") {
                                                    Users.findOneAndUpdate(
                                                        { refferalCode: refCodeFromUser, isActive: true },
                                                        {
                                                            $push: {
                                                                reffered: ObjectId(userId)
                                                            },
                                                            $inc: { contestCount: 1 }
                                                        },
                                                        { returnOriginal: false }).then(result1 => {
                                                        }).catch(error => {
                                                        });
                                                    Users.findOneAndUpdate(
                                                        { '_id': ObjectId(userId), isActive: true },
                                                        {
                                                            $set: {
                                                                refCodeFromUser: refCodeFromUser
                                                            }
                                                        },
                                                        { returnOriginal: false }).then(result1 => {
                                                        }).catch(error => {
                                                        });
                                                }
                                                res.status(httpStatus.OK).json({
                                                    status: true,
                                                    statusCode: 200,
                                                    message: "success",
                                                    result: {
                                                        userId: userId,
                                                        name: (response === null) ? "" : response.value.name,
                                                        phone: (response === null) ? "" : response.value.phone,
                                                        isOtpVerified: (response === null) ? false : response.value.isOtpVerified,
                                                        userType: (response === null) ? "" : response.value.userType,
                                                        message: text_settings["user.please_verify_otp"]
                                                    }
                                                });
                                            }).catch(errMessage => {
                                                res.status(httpStatus.OK).json({
                                                    status: false,
                                                    statusCode: 500,
                                                    message: errMessage
                                                });
                                            });
                                        }).catch(err => {
                                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                status: false,
                                                statusCode: 500,
                                                message: text_settings['system.something_went_wrong']
                                                //error: err.message
                                            });
                                        });
                                    }
                                }).catch(err => {
                                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                        status: false,
                                        statusCode: 500,
                                        message: text_settings['system.something_went_wrong']
                                        // error: err.message
                                    })
                                });
                            } else {
                                res.status(httpStatus.OK).json({
                                    status: false,
                                    statusCode: 500,
                                    message: text_settings['user.not_found']
                                })
                            }
                        }).catch(error => {
                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.something_went_wrong']
                                // error: error.message
                            })
                        });
                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                            // error: errors
                        })
                    }
                } else {
                    res.status(httpStatus.BAD_REQUEST).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.Please_send_data_using_post_method'],
                    })
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
                // error: ex.message
            });
        }
    }


    /**
    * Function to verify otp for social signin
    */
    this.verifyOtpSocialLogin = function (req, res) {
        try {
            commonUtility.isPost(req, res, function (isPost) {
                if (isPost) {
                    req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                    req.checkBody({
                        "userId": {
                            notEmpty: true,
                            isAlphanumeric: true,
                            isLength: { options: [24, 24] },
                            errorMessage: text_settings["user.userid_required"]
                        },
                        "otp": {
                            notEmpty: true,
                            isNumeric: true,
                            isLength: { options: [4, 4] },
                            errorMessage: text_settings["user.otp_required"]
                        },
                    });
                    var errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        let userId = req.body.userId;
                        let otp = req.body.otp;
                        let Users = db.collection("users");
                        let Otps = db.collection("otps");
                        let ValidateLogins = db.collection("validatelogins");

                        Users.findOne({ '_id': ObjectId(userId) }).then(response => {
                            if (response === null) {
                                res.status(httpStatus.OK).json({
                                    status: false,
                                    statusCode: 200,
                                    message: text_settings["user.not_found"]
                                })
                            } else {
                                if (response.isOtpVerified) {
                                    res.status(httpStatus.OK).json({
                                        status: false,
                                        statusCode: 200,
                                        message: text_settings["user.otp_already_verified"]
                                    });
                                } else {
                                    Otps.findOne({ 'phone': response.phone, 'otpStatus': 0 }).then(otpData => {
                                        if (otpData === null) {
                                            res.status(httpStatus.OK).json({
                                                status: false,
                                                statusCode: 200,
                                                message: text_settings["user.otp_not_found"]
                                            });
                                        } else {
                                            if (otpData.otp != otp) {
                                                res.status(httpStatus.OK).json({
                                                    status: false,
                                                    statusCode: 200,
                                                    message: text_settings["user.otp_not_valid"]
                                                });
                                            } else {
                                                let dateNow = moment(Date.now());
                                                let otpExpiredDate = moment(otpData.createdAt).add(2, 'h');
                                                if (otpExpiredDate._d > dateNow._d) {
                                                    Otps.findOneAndUpdate(
                                                        { 'phone': response.phone, 'otp': parseInt(otp), 'otpStatus': 0 },
                                                        {
                                                            '$set': { 'otpStatus': 1, 'updatedAt': new Date() }
                                                        }).then(updateStatus => {
                                                            Users.findOneAndUpdate(
                                                                { '_id': ObjectId(userId), 'isOtpVerified': false },
                                                                { '$set': { 'isOtpVerified': true } },
                                                                { returnOriginal: false }
                                                            ).then(otpVerifiedStatus => {
                                                                var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                                                                getValidateLogin(ip, userId, response.userType).then(validateLogin => {
                                                                    ValidateLogins.insertOne(validateLogin).then(validateLoginResponse => {
                                                                        res.status(httpStatus.OK).json({
                                                                            status: true,
                                                                            statusCode: 200,
                                                                            message: "success",
                                                                            result: {
                                                                                userId: response._id,
                                                                                userType: response.userType,
                                                                                name: (response.name === null) ? "" : response.name,
                                                                                message: text_settings["user.otp_verified"],
                                                                                authToken: validateLogin.token
                                                                            }
                                                                        });
                                                                    }).catch(validateLoginErr => {
                                                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                            status: false,
                                                                            statusCode: 500,
                                                                            message: text_settings['system.something_went_wrong']
                                                                            // error: validateLoginErr.message
                                                                        });
                                                                    });
                                                                }).catch(validateLoginError => {
                                                                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                        status: false,
                                                                        statusCode: 500,
                                                                        message: text_settings['system.something_went_wrong']
                                                                        // error: validateLoginError.message
                                                                    });
                                                                });
                                                            }).catch(otpVerifiedErr => {
                                                                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                    status: false,
                                                                    statusCode: 500,
                                                                    message: text_settings['system.something_went_wrong']
                                                                    // error: otpVerifiedErr.message
                                                                });
                                                            });
                                                        }).catch(err => {
                                                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                                status: false,
                                                                statusCode: 500,
                                                                message: text_settings['system.something_went_wrong']
                                                                // error: err.message
                                                            });
                                                        });
                                                } else {
                                                    res.status(httpStatus.OK).json({
                                                        status: false,
                                                        statusCode: 200,
                                                        message: text_settings["user.otp_expired"]
                                                    });
                                                }
                                            }
                                        }
                                    }).catch(otpErr => {
                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                            status: false,
                                            statusCode: 500,
                                            message: text_settings['system.something_went_wrong']
                                            // error: otpErr.message
                                        });
                                    });
                                }
                            }
                        }).catch(error => {
                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.something_went_wrong']
                                // error: error.message
                            });
                        });
                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                            // error: errors
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
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
                // error: ex.message
            });
        }
    }


    /**
    * Function to update phone number at the time of signup if enter incorrect
    * req parameters - userId, phone number
    */
    this.changePhoneNumber = function (req, res) {
        try {
            commonUtility.isPost(req, res, function (isPost) {
                if (isPost) {
                    req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                    req.checkBody({
                        "userId": {
                            notEmpty: true,
                            isAlphanumeric: true,
                            isLength: { options: [24, 24] },
                            errorMessage: text_settings["user.userid_required"]
                        },
                        "phone": {
                            notEmpty: true,
                            isNumeric: true,
                            isLength: { options: [10, 10] },
                            errorMessage: text_settings["user.phone_required"]
                        }
                    });
                    var errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        let userId = req.body.userId;
                        let phone = req.body.phone;
                        let Users = db.collection('users');
                        Users.findOne({ $and: [{ '_id': ObjectId(userId), 'isOtpVerified': false }, { 'isActive': true }] }).then(response => {
                            if (response === null) {
                                res.status(httpStatus.OK).json({
                                    status: false,
                                    statusCode: 200,
                                    message: text_settings['user.not_found']
                                })
                            } else {
                                if (response.isBlocked) {
                                    res.status(httpStatus.OK).json({
                                        status: false,
                                        statusCode: 200,
                                        message: text_settings["user.blocked"]
                                    });
                                }
                                else {
                                    Users.findOne({ 'phone': phone }).then(user => {
                                        if (user === null) {
                                            Users.findOneAndUpdate({ '_id': ObjectId(userId) }, { $set: { 'phone': phone } }).then(result => {
                                                sendOtp(phone).then(otp => {
                                                    res.status(httpStatus.OK).json({
                                                        status: true,
                                                        statusCode: 200,
                                                        message: "success",
                                                        result: {
                                                            userId: userId,
                                                            message: text_settings["user.phone_number_updated"]
                                                        }
                                                    });
                                                }).catch(errMessage => {
                                                    res.status(httpStatus.OK).json({
                                                        status: false,
                                                        statusCode: 500,
                                                        message: errMessage
                                                    });
                                                });
                                            }).catch(err => {
                                                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                    status: false,
                                                    statusCode: 500,
                                                    message: text_settings['system.something_went_wrong']
                                                    // error: err.message
                                                });
                                            });
                                        } else {
                                            res.status(httpStatus.OK).json({
                                                status: false,
                                                statusCode: 200,
                                                message: text_settings["user.phone_already_exists"]
                                            });
                                        }
                                    }).catch(er => {
                                        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                            status: false,
                                            statusCode: 500,
                                            message: text_settings['system.something_went_wrong']
                                            // error: er.message
                                        });
                                    });
                                }
                            }
                        }).catch(error => {
                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                status: false,
                                statusCode: 500,
                                message: text_settings['system.something_went_wrong']
                                // error: error.message
                            });
                        })
                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            statusCode: 500,
                            message: text_settings['system.something_went_wrong']
                            // error: errors
                        });
                    }
                } else {
                    res.status(httpStatus.BAD_REQUEST).json({
                        status: false,
                        statusCode: 500,
                        message: text_settings['system.Please_send_data_using_post_method']
                    });
                }
            });
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
                // error: ex.message
            });
        }
    }


    /**
    * Function to get user profile by id
    *  req parameters - userId
    */


    //////////////////////////////////Sign In - Sign Up End //////////////////////////////
    /**
     * function to get validate login object
     */
    async function getValidateLogin(ip, userId, userType) {
        var obj = {};
        try {
            await getToken().then(token => {
                obj.userId = ObjectId(userId);
                obj.userType = userType;
                obj.token = token;
                obj.ip = ip.replace('::ffff:', '');
                obj.isAnonymousToken = false;
                obj.isActive = true;
                obj.createdAt = new Date();
                obj.updatedAt = new Date();
            }).catch(error => {
            });
        } catch (ex) {
        }
        return obj;
    }


    /**
     * function to get token
     */
    function getToken() {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(48, (err, buffer) => {
                if (!err) {
                    resolve(buffer.toString('hex'));
                }
                else {
                    resolve(getRandomString(96));
                }
            });
        })
    };
    /**
     * function to get random bytes
     */
    function getRandomString(length) {
        let chars = "0123456789abcdefghijklmnopqrstuvwxyz";
        var result = '';
        for (var i = length; i > 0; --i)
            result += chars[Math.floor(Math.random() * chars.length)];
        return result;
    }
    /**
     * Function to get device information 
     */
    this.getDeviceInfo = function (req, res) {
        try {
            commonUtility.isPost(req, res, function (isPost) {
                if (isPost) {
                    req.body = commonUtility.sanitizeData(req.body, NOT_ALLOWED_TAGS_XSS);
                    req.checkBody({
                        // "ip": {
                        //     notEmpty: true,
                        // },
                        "deviceId": {
                            notEmpty: true
                        },
                        "deviceType": {
                            notEmpty: true
                        },
                        // "appVersion": {
                        //     notEmpty: true
                        // },
                        // "osVersion": {
                        //     notEmpty: true
                        // },
                        "deviceToken": {
                            notEmpty: true
                        }
                    });
                    var errors = commonUtility.parseValidation(req.validationErrors(), req);
                    if (!errors) {
                        let deviceInfo = db.collection('deviceInfo');
                        let ip = req.body.ip;
                        let deviceId = req.body.deviceId;
                        let deviceType = req.body.deviceType;
                        let appVersion = req.body.appVersion;
                        let osVersion = req.body.osVersion;
                        let deviceToken = req.body.deviceToken;
                        deviceInfo.findOne(
                            { "deviceId": deviceId },
                            (err, result) => {
                                if (err) {
                                    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                        status: false,
                                        error: text_settings['system.something_went_wrong']
                                        // error: err.message
                                    });
                                } else {
                                    if (result != null) {
                                        deviceInfo.findOneAndUpdate(
                                            {
                                                'deviceId': deviceId
                                            },
                                            {
                                                $set: {
                                                    'updatedAt': new Date(),
                                                    "deviceToken": deviceToken
                                                }
                                            }
                                        ).then(result => {
                                            res.status(httpStatus.OK).json({
                                                status: true
                                            });
                                        }).catch(error => {
                                            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                                                status: false,
                                                // error: error.message
                                                statusCode: 500,
                                                message: text_settings['system.something_went_wrong']
                                            });
                                        });
                                    } else {
                                        deviceInfo.insertOne({
                                            // "ip"          : ip,
                                            "deviceId": deviceId,
                                            "deviceType": deviceType,
                                            // "appVersion"  : appVersion,
                                            // "osVersion"   : osVersion,
                                            "deviceToken": deviceToken,
                                            'createdAt': new Date(),
                                            'updatedAt': new Date(),
                                            'notificationStatus': true
                                        }).then(searchResponse => {
                                            res.status(httpStatus.OK).json({
                                                status: true
                                            });
                                        }).catch(searchErr => {
                                            res.status(httpStatus.OK).json({
                                                status: true
                                            });
                                        });
                                    }
                                }
                            }
                        )
                    } else {
                        res.status(httpStatus.BAD_REQUEST).json({
                            status: false,
                            // error: errors
                            statusCode: 500,
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
        } catch (ex) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                status: false,
                // error: ex.message
                statusCode: 500,
                message: text_settings['system.something_went_wrong']
            });
        }
    }
}
module.exports = new Account();


