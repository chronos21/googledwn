#!/usr/bin/env node

const argv = process.argv
const { spawn } = require('child_process')
const axios = require('axios')
const { statSync, unlinkSync } = require("fs");

function getFileID(url) {
    let FILEID

    if (url.includes('/file/d/')) {
        FILEID = url.split('/file/d/')[1].split('/')[0]
    } else {
        FILEID = url.split('id=')[1]
        if (FILEID.includes('&')) {
            FILEID = FILEID.split('&')[0]
        }
    }

    return FILEID
}

async function getFileName(FILEID, argv = []) {
    let data
    let FILENAME

    argv.forEach((item, idx) => {
        if (idx > 1 && !item.includes('http')) {
            FILENAME = item
        }
    })

    if (FILENAME) {
        return FILENAME
    }

    let trueUrl = `https://docs.google.com/uc?id=${FILEID}`

    try {
        let res = await axios.get(trueUrl)
        data = res.data
    } catch (err) {
        console.log(err.message)
    }

    try {
        FILENAME = data.split('<span class="uc-name-size">')[1].split('</a>')[0].split('">')[1]
        if (!FILENAME) {
            throw new Error('NO FILENAME AND ID')
        }
        return FILENAME
    } catch (err) {
        console.log(err.message)
    }

    try {
        let res = await axios.get(`https://drive.google.com/file/d/${FILEID}/view`)
        data = res.data
        FILENAME = data.split('<meta itemprop="name" content="')[1].split('"><meta')[0]
        if (!FILENAME) {
            throw new Error('LINK IS RESTRICTED')
        }
        return FILENAME
    } catch (err) {
        throw new Error(err.message)
    }
}

async function handleDownload(argv) {
    let url = argv[2]
    if (!url || !url.includes('http')) {
        url = argv[1]
    }
    
    if (!url || !url.includes('http')) {
        throw new Error('INVALID URL')
    }

    const FILEID = getFileID(url)
    const FILENAME = await getFileName(FILEID, argv)

    try {
        const size = getFileSize(FILENAME)
        if(size < 10){
            unlinkSync(FILENAME)
            console.log('FILE SIZE IS UNDER 3MB. RESTARTING DOWNLOAD.')
        } else {
            console.log('FILE SIZE IS ABOVE 3MB. CONTINUING...')
        }
    } catch (err) {
        console.log(err.message)
    }

    const command = `wget --continue --load-cookies /tmp/cookies.txt "https://docs.google.com/uc?export=download&confirm=$(wget --quiet --save-cookies /tmp/cookies.txt --keep-session-cookies --no-check-certificate 'https://docs.google.com/uc?export=download&id=` + FILEID + `' -O- | sed -rn 's/.*confirm=([0-9A-Za-z_]+).*` + "/\\1\\n/p')" + `&id=` + FILEID + `" -O "` + FILENAME + `" && rm -rf /tmp/cookies.txt`
    spawn('sh', ['-c', command], { stdio: 'inherit' });
}

function getFileSize(path) {
    const bytes = statSync(path).size
    const megaBytes = bytes / (1024 * 1024);
    return megaBytes;
}

handleDownload(argv)