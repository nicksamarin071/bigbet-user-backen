const express = require('express');
const router = express.Router();
const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
let apiSuccessRes = globalFunction.apiSuccessRes;
const multer = require('multer');
const path = require('path');
let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    //console.log("destination  ",destination);
    cb(null, settings.filePath)
  },
  filename: (req, file, cb) => {
    console.log("file.fieldname  ", file.fieldname);
    console.log("final file name :::   ", Date.now() + path.extname(file.originalname));
    req.body.imageFileName = (file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});
let upload = multer({ storage: storage, limits: {fileSize: 1000000}});
async function uploadFile(req, res) {
 
	let resData = {
	  uploadedImageName: req.body.imageFileName,
	  imageUrl: "settings.filePath" + req.body.imageFileName
	}
	return apiSuccessRes(req, res, "Sucess", resData);
}
router.post('/uploadFile', upload.single('image'), uploadFile); 
module.exports = router;