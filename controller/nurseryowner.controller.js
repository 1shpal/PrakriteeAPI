const NurseryOwner = require("../model/nurseryowner.model");
const { validationResult } = require('express-validator');
const requests = require("request");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { response } = require("express");
const crypto = require('crypto');
const Email = require('../other/sendEmail');

const key = "prakritee@123@05";
const algo = "aes-256-cbc"

exports.signup = (request, response) => {
    console.log(request.body);
    const error = validationResult(request);
    if (!error.isEmpty()) {
        return response.status(400).json({ errors: error.array() });
    }

    var cipher = crypto.createCipher(algo, key)
    var crypted = cipher.update(request.body.nurseryOwnerPassword, 'utf8', 'hex');
    crypted += cipher.final('hex');
    request.body.nurseryOwnerPassword = crypted;

    NurseryOwner.create(request.body)
        .then(async result => {

            var flag = await Email.sendMail(result.nurseryOwnerEmail, "Verify Your Gmail Account", `<p>you are a nice person for signing up with Prakritee! You must follow this link within 30 days of registration to activate your account:</p><a href= "https://prakritee.herokuapp.com/nurseryowner/verify-account/` + result._id + `">click here</a>`);

            return response.status(201).json(result)
        }).catch(err => {
            console.log(err);
            return response.status(500).json({ message: "Internal Server Error..." })
        })
}

exports.signin = (request, response) => {
    const errors = validationResult(request);
    if (!errors.isEmpty())
        return response.status(400).json({ errors: errors.array() });
    console.log(request.body)

    NurseryOwner.findOne({
        nurseryOwnerEmail: request.body.nurseryOwnerEmail,
        isVerify: true,
        isBlock: false,
        isApproved: true
    }).then(result => {
        if (result) {
            var decipher = crypto.createDecipher(algo, key)
            var dec = decipher.update(result.nurseryOwnerPassword, 'hex', 'utf8')
            dec += decipher.final('utf8');

            if (dec == request.body.nurseryOwnerPassword) {
                let payload = { subject: result._id };
                let token = jwt.sign(payload, "giugifsyjhsadgjbjfbbdsfjbjbk");

                return response.status(201).json({ status: "login success", data: result, token: token })
            } else
                return response.status(201).json({ message: "Invalid Email And Password" })
        } else {
            return response.status(201).json({ failed: "login failed" })
        }
    }).catch(err => {
        return response.status(500).json({ error: "oops something went wrong" })
    })
}

exports.signinWithGoogle = (request, response) => {
    const errors = validationResult(request);
    if (!errors.isEmpty())
        return response.status(400).json({ errors: errors.array() });

    NurseryOwner.findOne({
        nurseryOwnerEmail: request.body.nurseryOwnerEmail,
        isVerify: true,
        isBlock: false,
        isApproved: true
    }).then(result => {
        if (result) {
            let payload = { subject: result._id };
            let token = jwt.sign(payload, "giugifsyjhsadgjbjfbbdsfjbjbk");

            return response.status(201).json({ status: "login success", data: result, token: token })
        } else {
            console.log(result)
            return response.status(201).json({ failed: "login failed" })
        }
    }).catch(err => {
        return response.status(500).json({ error: "oops something went wrong" })
    })
}

exports.updateProfile = (request, response) => {

    const error = validationResult(request);
    if (!error.isEmpty()) {
        return response.status(400).json({ errors: error.array() });
    }
    if (request.file)
        request.body.Image = "https://firebasestorage.googleapis.com/v0/b/prakriti-3d8ad.appspot.com/o/" + request.file.filename + "?alt=media&token=abcddcba"


    NurseryOwner.updateOne({
        _id: request.body.nurseryownerId,
        isVerify: true,
        isBlock: false,
        isApproved: true
    }, {
        $set: request.body
    })
        .then(result => {
            if (result.modifiedCount == 1)
                return response.status(201).json({ success: "Updated Successfolly" });
            else
                return response.status(201).json({ success: "Not Updated" });
        }).catch(err => {
            console.log(err);
            return response.status(500).json({ message: "Internal Server Error..." })
        })
}

exports.verifyAccountPage = (request, response) => {
    return response.status(200).render("verify-account.ejs", {
        apiUrl: "https://prakritee.herokuapp.com/nurseryowner/get-verified-account/" + request.params.id
    });
}

exports.getVerifiedAccount = (request, response) => {

    NurseryOwner.updateOne({ _id: request.params.id }, {
        $set: {
            isVerify: true
        }
    })
        .then(result => {
            if (result.modifiedCount == 1)
                return response.status(200).render("success-page-nursery.ejs");
            else
                return response.status(201).json({ failed: "Something went wrong" });
        })
        .catch(err => {
            return response.status(500).json({ error: "Internal Server Error..." })
        });

}

exports.forgotPassword = (request, response) => {
    NurseryOwner.findOne({
        nurseryOwnerEmail: request.body.nurseryOwnerEmail
    }).then(async result => {
        if (result) {
            var decipher = crypto.createDecipher(algo, key)
            var dec = decipher.update(result.nurseryOwnerPassword, 'hex', 'utf8')
            dec += decipher.final('utf8');
            result.nurseryOwnerPassword = dec;

            var flag = await Email.sendMail(result.nurseryOwnerEmail, "Forgot Password", `
                 <p>Your old password is here 👇🏻</p>
                 <br>
                 <h3>PASSWORD: ` + result.nurseryOwnerPassword + `</h3>
                 `);

            if (flag)
                return response.status(200).json({ success: "check your email", result: result });
            else
                return response.status(200).json({ message: "Please try again later" })
        } else {
            return response.status(200).json({ message: "No User Found With This Email Address" })
        }
    }).catch(err => {
        console.log(err);
        return response.status(500).json({ error: "oops something went wrong" })
    })
}


exports.nurseryList = (request, response) => {
    NurseryOwner.find({
        isVerify: true,
        isBlock: false,
        isApproved: true
    }).then(result => {
        if (result.length > 0) {
            return response.status(201).json(result)
        } else {
            console.log(result)
            return response.status(201).json({ message: "Result Not Found" })
        }
    }).catch(err => {
        return response.status(500).json({ error: "oops something went wrong" })
    })
}


exports.nurseryRequest = (request, response) => {
    NurseryOwner.find({
        isVerify: true,
        isApproved: false
    }).then(result => {
        if (result.length > 0) {
            return response.status(201).json(result)
        } else {
            console.log(result)
            return response.status(201).json({ message: "Result Not Found" })
        }
    }).catch(err => {
        return response.status(500).json({ error: "oops something went wrong" })
    })
}


exports.nurseryRequestApprove = (request, response) => {
    NurseryOwner.updateOne({ _id: request.body.nurseryownerId, isVerify: true }, {
        $set: {
            isApproved: true
        }
    }).then(async result => {
        if (result.modifiedCount == 1) {

            var flag = await Email.sendMail(request.body.nurseryOwnerEmail, "🎉 Message Form Prakritee 🎉", `<p>Your Nursery Is Verified By The Admin. This is Your Dashboard 👇🏻</p>
                 <br>
                 <a href="https://prakriti-dashboard.herokuapp.com">Click Here</a>
                 <br>
                 <p>Hurry up go through this link and login and grow your business.</p>`);

            if (flag)
                return response.status(201).json({ success: "Successfully Approved" })
            else
                return response.status(201).json({ message: "Successfully Approved but didn't notify the owner" })
        } else {
            return response.status(201).json({ failed: "Not Approved" })
        }
    }).catch(err => {
        return response.status(500).json({ error: "oops something went wrong" })
    })
}

exports.nurseryRequestCancel = (request, response) => {
    NurseryOwner.deleteOne({ _id: request.body.nurseryownerId, isApproved: false })
        .then(async result => {
            if (result.deletedCount == 1) {

                var flag = await Email.sendMail(request.body.nurseryOwnerEmail, "🚨 Message Form Prakritee 🚨", `
                 <p>Your Nursery Is Verified By The Admin.And Admin rejected your request for join the Prakriti.com. Because of some resion</p>
                 <br>
                 <p>If Have Any Objection so don't </p>
                 `);

                if (flag)
                    return response.status(201).json({ success: "Successfully Rejected" })
                else
                    return response.status(201).json({ message: "Successfully Rejected but didn't notify the owner" })
            } else {
                console.log(result)
                return response.status(201).json({ failed: "Not Rejected" })
            }
        }).catch(err => {
            return response.status(500).json({ error: "oops something went wrong" })
        })
}

exports.blockNursery = (request, response) => {
    NurseryOwner.updateOne({ _id: request.body.nurseryownerId }, {
        $set: {
            isBlock: true
        }
    })
        .then(result => {
            if (result.modifiedCount == 1) {
                NurseryOwner.findOne({ _id: request.body.nurseryownerId }).then(async nurseryowner => {
                    if (nurseryowner) {

                        var flag = await Email.sendMail(nurseryowner.nurseryOwnerEmail, "🚨 Alert From Prakritee 🚨", `<p>Your account is blocked by the Prakritee Admin</p>`);
                        if (flag)
                            return response.status(201).json({ success: "Successfully Blocked Nursery Owner" });
                        else
                            return response.status(201).json({ message: "Blocked But Notification Not Sent.." });
                    } else
                        return response.status(201).json({ message: "Blocked But Notification Not Sent.." });


                }).catch(err => {
                    return response.status(500).json({ error: "oops something went wrong" })
                })
            } else
                return response.status(201).json({ message: "Not Blocked.." });
        })
        .catch(err => {
            return response.status(500).json({ error: "oops something went wrong" })
        });
}

exports.unBlockNursery = (request, response) => {
    NurseryOwner.updateOne({ _id: request.body.nurseryownerId }, {
        $set: {
            isBlock: false
        }
    })
        .then(result => {
            if (result.modifiedCount == 1) {
                NurseryOwner.findOne({ _id: request.body.nurseryownerId }).then(async nurseryowner => {
                    if (nurseryowner) {

                        var flag = await Email.sendMail(nurseryowner.nurseryOwnerEmail, "🎉 Alert From Prakritee 🎉", `<p>Your account is Unblocked by the Prakritee Admin. Now you can signin in Prakritee.com</p>`);
                        if (flag)
                            return response.status(200).json({ success: "Successfully Unblocked Nursery Owner" });
                        else
                            return response.status(201).json({ message: "Unblocked But Notification Not Sent.." });
                    } else
                        return response.status(201).json({ message: "Unblocked But Notification Not Sent.." });


                }).catch(err => {
                    return response.status(500).json({ error: "oops something went wrong" })
                })
            } else
                return response.status(201).json({ message: "Not Unblocked.." });
        })
        .catch(err => {
            return response.status(500).json({ error: "oops something went wrong" })
        });
}


exports.nurseryById = (request, response) => {
    NurseryOwner
        .findOne({ _id: request.params.nurseryId })
        .then(result => {
            if (result) {
                return response.status(200).json(result);
            } else {
                return response.status(200).json({ message: "No Result Found" });
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: "something went wrong" });
        });
};

exports.checkEmail = (request, response) => {
    NurseryOwner
        .findOne({ nurseryOwnerEmail: request.params.nurseryOwnerEmail })
        .then(result => {
            if (result) {
                return response.status(200).json({ exist: true });
            } else {
                return response.status(200).json({ exist: false });
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: "something went wrong" });
        });
}


exports.checkMobile = (request, response) => {
    NurseryOwner
        .findOne({ nurseryOwnerMobile: request.params.nurseryOwnerMobile })
        .then(result => {
            if (result) {
                return response.status(200).json({ exist: true });
            } else {
                return response.status(200).json({ exist: false });
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: "something went wrong" });
        });
}