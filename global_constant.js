/* Including text settings file */
require('./text_settings');

WEBSITE_ROOT_PATH = __dirname + "/";
DB_CONNECTION_PATH = __dirname + "/config/";

/* Response Status */
STATUS_SUCCESS = 'success';
STATUS_ERROR = 'error';

/* Not allowed html tags list*/
NOT_ALLOWED_TAGS_XSS = [/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, /<script\b[^<]*/gi, /<\/script>/gi];
const userType = {
    EndUser: 2,
    Admin: 1,
};
const signupType = {
    EmailorPhone: 1,
    Facebook: 2,
    Google: 3
};
const verifyOtpType = {
    SignIn: 1,
    SignUp: 2
};
const changePhoneorEmail = {
    Email: 1,
    Phone: 2
}
module.exports.UserType = userType;
module.exports.VerifyOtpType = verifyOtpType;
module.exports.SignupType = signupType;
module.exports.ChangePhoneorEmail = changePhoneorEmail;