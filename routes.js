require("./global_constant");
const mongodb = require(DB_CONNECTION_PATH + 'connection_mongo');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
aws.config.update({
    secretAccessKey: "KVyRIBkYLUmTMklA0cq/EN6TwdaLvMs/8V0j0vFM",
    accessKeyId: "AKIAYTAUBLVOFTYWQOJ3",
    region: 'ap-south-1' //E.g us-east-1
});
const s3 = new aws.S3();

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb('Invalid file type, only JPEG and PNG is allowed!', false);
    }
};

const upload = multer({
    fileFilter: fileFilter,
    storage: multerS3({
        acl: 'public-read',
        s3,
        bucket: 'khel11',
        key: function (req, file, cb) {
            req.file = Date.now() + file.originalname;
            cb(null, Date.now() + file.originalname);
        }
    })
});

module.exports = {
    configure: function (app) {
        mongodb.connectToServer((err) => {
            db = mongodb.getDb();
            var account = require(WEBSITE_ROOT_PATH + "api/handler/account");
            var mobile = require(WEBSITE_ROOT_PATH + "api/handler/mobile");
            app.post("/khel11/signUp", (req, res) => {
                account.signUp(req, res);
            });
            app.get("/khel11/getAllContest", (req, res) => {
                mobile.getAllContest(req, res);
            });
            app.post("/khel11/selectContest", (req, res) => {
                mobile.selectContest(req, res);
            });
            app.post("/khel11/pollSelection", (req, res) => {
                mobile.pollSelection(req, res);
            });
            app.post("/khel11/verifyOtp", (req, res) => {
                account.verifyOtp(req, res);
            });
            app.post("/khel11/resendOtp", (req, res) => {
                account.resendOtp(req, res);
            });
            app.post("/khel11/signIn", (req, res) => {
                account.signIn(req, res);
            });
            app.get("/khel11/getUserProfile", (req, res) => {
                account.getUserProfile(req, res);
            });
            app.post("/khel11/updateUserProfile", (req, res) => {
                account.updateUserProfile(req, res);
            });
            app.post("/khel11/logout", (req, res) => {
                account.logout(req, res);
            });
            app.post("/khel11/socialLogin", (req, res) => {
                account.socialLogin(req, res);
            });
            app.post("/khel11/addPhoneSocialLogin", (req, res) => {
                account.addPhoneSocialLogin(req, res);
            })
            app.post("/khel11/verifyOtpSocialLogin", (req, res) => {
                account.verifyOtpSocialLogin(req, res);
            })
            app.post("/khel11/changePhoneNumber", (req, res) => {
                account.changePhoneNumber(req, res);
            })
            app.get("/khel11/getMatchListingForLive", (req, res) => {
                mobile.getMatchListingForLive(req, res);
            });
            app.get("/khel11/getMatchListingForResult", (req, res) => {
                mobile.getMatchListingForResult(req, res);
            });
            app.get("/khel11/getMatchListingForUpcoming", (req, res) => {
                mobile.getMatchListingForUpcoming(req, res);
            });
            app.get("/khel11/getInternationalTeams", (req, res) => {
                mobile.getInternationalTeams(req, res);
            });
            app.post("/khel11/uploadImage", upload.array('image', 1), (req, res) => {
                mobile.uploadImage(req, res);
            });
            app.post("/khel11/getPlayerStats", (req, res) => {
                mobile.getPlayerStats(req, res);
            });
            app.post("/khel11/getTeamPlayer", (req, res) => {
                mobile.getTeamPlayer(req, res);
            });
            app.post("/khel11/getMatchInfoListing", (req, res) => {
                mobile.getMatchInfoListing(req, res);
            });
            app.post("/khel11/getMatchSquardListing", (req, res) => {
                mobile.getMatchSquardListing(req, res);
            });
            app.post("/khel11/getMatchScorecardListing", (req, res) => {
                mobile.getMatchScorecardListing(req, res);
            });
            app.get("/khel11/getBannerForApp", (req, res) => {
                mobile.getBannerForApp(req, res);
            });
            app.post("/khel11/getPublishedNewsForApp", (req, res) => {
                mobile.getPublishedNewsForApp(req, res);
            });
            app.post("/khel11/getDeviceInfo", (req, res) => {
                account.getDeviceInfo(req, res);
            });
            app.get("/khel11/test", (req, res) => {
                mobile.test(req, res);
            });
            app.get("/*", (req, res) => {
                res.send("okay")
            });
            //To handle 404 error if url not exist  
            app.use((req, res, next) => {
                res.status(404).json({
                    status: false,
                    error: text_settings['system.page_not_found']
                });
            });
        });
    }
}
