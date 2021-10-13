#this script supports both HLS and ICECAST

# sample stream for testing purposes
STREAM_INPUT=rtmp://ec2-54-255-223-194.ap-southeast-1.compute.amazonaws.com/live/testmeeting

# checking if stream input is defined
if [ -z  ${STREAM_INPUT} ]
then
	printf "please provide a streaming link passed as an env variable (STREAM_INPUT)"
	exit 1
fi

while :
do
	echo "Loop start"
	feed_time=$(ffprobe -v error -show_entries format=start_time -of default=noprint_wrappers=1:nokey=1 $STREAM_INPUT)
	printf "feed_time value: ${feed_time}\n"
	if [ ! -z ${feed_time} ]
	then
		ffmpeg -i $STREAM_INPUT -tune zerolatency -muxdelay 0 -af "afftdn=nf=-20, highpass=f=200, lowpass=f=3000" -vn -sn -dn -f wav -ar 16000 -ac 1 - 2>/dev/null | node transcribe.js $feed_time
	fi
	echo "Loop finish"

	sleep 3
done