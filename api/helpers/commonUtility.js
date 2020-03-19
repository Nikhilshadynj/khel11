var httpStatus = require('http-status');
const ObjectId = require('mongodb').ObjectID;
var async = require("async");

function CommonUtility() {

    /**
	 * Function to check if the request body is not empty.
	 *
	 * @param req as Request
	 * @param res as Response
	 * @param callback as Callback function
	 * @return boolean.
	 */
    this.isPost = function (req, res, callback) {
        if (typeof req.body !== typeof undefined && Object.keys(req.body).length != 0) {
            callback(true);
        } else {
            callback(false);
        }
    }// End isPost()

    /**
	 * Function for sanitize form data
	 *
	 * @param data				As Request Body
	 * @param notAllowedTags	As Array of not allowed tags
	 *
	 * @return json
	 */
    this.sanitizeData = function (data, notAllowedTags) {
        var sanitized = arrayStripTags(data, notAllowedTags);
        return sanitized;
    }// End sanitizeData();

    /**
     * Function to strip not allowed tags from array
     *
     * @param array				As Data Array
     * @param notAllowedTags	As Tags to be removed
     *
     * @return array
     */
    function arrayStripTags(array, notAllowedTags) {
        if (array.constructor === Object) {
            var result = {};
        } else {
            var result = [];
        }
        for (var key in array) {
            value = (array[key] != null) ? array[key] : '';
            if (value.constructor === Array || value.constructor === Object) {
                result[key] = arrayStripTags(value, notAllowedTags);
            } else {
                result[key] = stripHtml(value.toString(), notAllowedTags);
            }
        }
        return result;
    }

    /**
     * Function to Remove Unwanted tags from string
     *
     * @param html	As Html Code
     *
     * @return html.
     */
    function stripHtml(html, notAllowedTags) {
        var unwantedTags = notAllowedTags;
        for (var j = 0; j < unwantedTags.length; j++) {
            html = html.replace(unwantedTags[j], '');
        }
        return html;
    }//end stripHtml();

    this.parseValidation = function (validationErrors, req) {
        var usedFields = [];
        var newValidations = [];
        if (Array.isArray(validationErrors)) {
            validationErrors.forEach(function (item) {
                if (usedFields.indexOf(item.param) == -1) {
                    usedFields.push(item.param);
                    newValidations.push(item);
                }
            });
            return newValidations;
        } else {
            return false;
        }
    } //End parseValidation();

    this.getRandomNotifyId = function () {
        var notifyId = Math.floor(100000 + Math.random() * 900000);
        return notifyId;
    }


    this.getRandomOtp = function () {
        let otp = Math.floor(1000 + Math.random() * 9000);
        return otp;
    }

    this.validateUser = function (req, res, callback) {
        try {
            let authorization = req.headers.authorization.split(" ");
            let bearer = authorization[0];
            let token = authorization[1];
            if (bearer === "Bearer") {
                db.collection("validatelogins").findOne({ $and: [{ 'token': token }, { 'isActive': true }] }).then(data => {
                    if (data !== null) {
                        let result = {
                            status: true,
                            statusCode: httpStatus.OK,
                            userId: data.userId,
                            isAnonymousToken: data.isAnonymousToken,
                            deviceId: data.deviceId
                        };
                        if (result.isAnonymousToken) {
                            result.statusCode = httpStatus.UNAUTHORIZED;
                            result.error = "Anonymous user can't access this service!"
                        }
                        callback(result);
                    }
                    else {
                        var err = {
                            status: false,
                            statusCode: httpStatus.FORBIDDEN,
                            error: "Auth failed!"
                        };
                        callback(err);
                    }
                }).catch(err => {
                    let er = {
                        status: false,
                        statusCode: httpStatus.INTERNAL_SERVER_ERROR,
                        error: err.message
                    };
                    callback(er);
                })
            } else {
                var err = {
                    status: false,
                    statusCode: httpStatus.UNAUTHORIZED,
                    error: "Auth failed!"
                };
                callback(err);
            }
        }
        catch (ex) {
            let exception = {
                status: false,
                statusCode: httpStatus.UNAUTHORIZED,
                error: "Auth failed!"
            };
            callback(exception);
        }
    }
}

module.exports = new CommonUtility();