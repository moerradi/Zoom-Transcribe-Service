const {exec} = require('child_process');
const express = require('express');
const { realpathSync } = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/newstream', async (req, res) =>{
	// const {streamLink} = req.body;
	const ret = await exec().stdout;
	res.json(ret);
})

app.listen(3000, ()=>{
	console.log('listening to port 3000');
})