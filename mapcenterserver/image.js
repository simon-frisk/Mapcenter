const mimeTypes = require('mime-types')
const uniqueFilename = require('unique-filename')
const sharp = require('sharp')
const axios = require('axios')
const multer = require('multer')
const express = require('express')
const fs = require('fs')
const image = express.Router()

const multerSetup = multer({
    storage: multer.diskStorage({
        destination(_, __, cb) {
            cb(null, './images')
        },
        filename(_, file, cb) {
            const fileName = uniqueFilename('') + '.' + mimeTypes.extension(file.mimetype)
            cb(null, fileName)
        }
    }),
    fileFilter(_, file, cb) {
        if(file.mimetype.startsWith('image/'))
            cb(null, true)
        else
            cb(null, false)
    }
}).single('image')

image.put('/map', (req, res, next) => {
    if(!req.userId)
        return res.send('user not authorized')
    next()
})

image.use(multerSetup)

image.use('/images', express.static('images'))

image.put('/map', (req, res) => {
    if(!req.file)
        return res.send('no file provided or provided file of wrong type')
    
    generateThumbnail(req.file)
        .then(() => {
            res.json({'image': 'images/' + req.file.filename})
        })
        .catch(err => {
            res.send('failed to generate thumbnail' + err)
        })
})

function generateThumbnail(file) {
    const image = sharp(file.path)
    return image.metadata()
        .then(metadata => {
            const thumbWidth = metadata.width > 400 ? 400 : metadata.width
            const thumbHeight = metadata.height > 250 ? 250 : metadata.height
            const thumbX = Math.floor((metadata.width - thumbWidth) / 2)
            const thumbY = Math.floor((metadata.height - thumbHeight) / 2)
            
            return image
                .extract({left: thumbX, top: thumbY, width: thumbWidth, height: thumbHeight})
                .toFile('./images/thumb_' + file.filename)
        })
}

exports.imageRouter = image

exports.generateOverviewMap = async function(lat, lon) {
    const url = `https://open.mapquestapi.com/staticmap/v5/map?key=qabAXGPxCyZzOOQz0cIBJpxAgU53XGwM&center=${lat}, ${lon}&size=300, 200@2x&zoom=9&type=map&locations=${lat}, ${lon}&defaultMarker=marker-FFC107-sm`
    
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })

    const fileName = 'overview_' + uniqueFilename('') + '.jpg'
    
    const writeStream = fs.createWriteStream('./images/' + fileName)

    response.data.pipe(writeStream)

    return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
    })
        .then(() => {
            return 'images/' + fileName
        })
}