const express = require('express');
const app = express();
const cors = require('cors');

const corsOptions = {
	origin: '*',
	optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  }

const DATABASE = {video_01: "/video.mp4", video_02: "/video2.mp4"}

app.use(express.json());
app.use(cors(corsOptions));

app.get('/', (req,res)=>{
	return res.status(200).send("this is response")
})

app.post('/test', (req, res) => {
	return res.send(DATABASE[req.body.hash])
})

const PORT = 3000;
app.listen(PORT, () => {console.log(`listening on port ${PORT}`);});