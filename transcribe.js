require('dotenv').config();
const fs = require('fs');

// use alternative region for the Amazon transcribe service
const AWS_REGION = process.env.REGION;

// optional : implemeting custom vovabulary or vocabulary filters please see documentation for furter explanation
const VOCABULARY_NAME = process.env.VOCABULARY_NAME;
// setting up the language code for the preffered transcribtion language
var LANGUAGE_CODE = process.env.LANGUAGE_CODE;
// in the aws console or programmatically using aws-sdk or aws-cli you can create a vocabilatry filer consisting of a group of "words" and apply the filet method to them
const VOCABULARY_FILTER = process.env.VOCABULARY_FILTER_NAME;
// TYPE: String | What to do when a word in the vocabulary filter is detected : ["remove", "mask", "tag"]

const VOCABULARY_FILTER_METHOD = process.env.VOCABULARY_FILTER_METHOD;
// setting up samiling rate 16000 HZ seems to be optimal as recommended by AWS documentation
var MediaSampleRateHertz;
MediaSampleRateHertz = 16000;

// set up english as default language if language is not specified
// English is en-US
if (!LANGUAGE_CODE) LANGUAGE_CODE = 'en-US';

// importing sdk for client transcribe streamingm
const {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} = require('@aws-sdk/client-transcribe-streaming');

const StreamAudioToHttp2 = async function () {
  // setting chuck size for the audio stream 4 mb is always the perfect chuck size for buffering
  process.stdin._writableState.highWaterMark = 4096;
  process.stdin.resume();

  const toTranscribe = async function* () {
    for await (const chunk of process.stdin) {
      if (chunk.length > 6000) continue;
      yield { AudioEvent: { AudioChunk: chunk } };
    }
  };

  // initiating the transcribie streaming client
  const transcribeClient = new TranscribeStreamingClient({
    region: AWS_REGION,
  });

  // speaker identification can be i;pleneted using 2 approeaches 
  // Approach 1 : the streaming team takes each zoom audio output and send it as a seperate channel and I can enable channel identificatoin and assing a labael to each channel
  // this approach will work perfectly but is so resource demanding so I am not rooting for ir that much
  // Approach 2 : I use aws transcribe built in speaker identification but it is not well implemented and still so buggy but i get the work done

  // this is the transcibtion command, to add further costumization please read : 
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-transcribe-streaming/classes/startstreamtranscriptioncommand.html
  const TranscriptionCommand = new StartStreamTranscriptionCommand({
    LanguageCode: LANGUAGE_CODE,
    VocabularyName: VOCABULARY_NAME,
    VocabularyFilterName: VOCABULARY_FILTER,
    VocabularyFilterMethod: VOCABULARY_FILTER_METHOD,
    MediaSampleRateHertz: MediaSampleRateHertz,
	// EnableChannelIdentification: true, 
	// NumberOfChannels: 2,
	ShowSpeakerLabel: true, // still expirimenting with speakers label aws transcribe can distinguish up to 10 individual speakers
    MediaEncoding: 'pcm',
    AudioStream: toTranscribe(),
  });

  const TranscriptionCommandOutput = await transcribeClient.send(
    TranscriptionCommand
  );

  // outputing the status code of the http2 stream handshake 200 is success
  console.log(
    `AWS Transcribe status code: ${TranscriptionCommandOutput.$metadata.httpStatusCode}`
  );
  for await (const transcriptionEvent of TranscriptionCommandOutput.TranscriptResultStream) {
    const transcript = transcriptionEvent.TranscriptEvent.Transcript;
    if (transcript) {
      const results = transcript.Results;
      if (results.length > 0) {
        if (results[0].Alternatives.length > 0) {
        //   let transcript = results[0].Alternatives[0].Transcript;
		  if (!results[0].IsPartial)
		  	{
				var speaker = results[0].Alternatives[0].Items[0].Speaker;
				var logStream = fs.createWriteStream(process.argv[3], {flags: 'a'});
				logStream.write("speaker " + speaker + " : ")
				  results[0].Alternatives[0].Items.forEach((element) =>{
					  if (element.Speaker === speaker || element.Speaker === undefined)
					  logStream.write(element.Content + " ");
					else
						{
							logStream.write("\n");
							speaker = element.Speaker;
							logStream.write("speaker " + speaker + " : ");
							logStream.write(element.Content + " ");
						}
				  })
				  logStream.write("\n");
			  }        // fix encoding for accented characters
        //   transcript = decodeURIComponent(transcript);
          // outputing results of only complete sentences
          //   console.clear();
		  // to send transcribtion results to front end and make front end syncronsie it with the video i will send the start time and end time of the transcript relative to stream start
		  // that's why in the start.sh script i use ffprobe to get the duration of stream till the given moment of the script start
		//   console.log(transcript);
        //   console.log( `${JSON.stringify(results[0].ChannelId)} : ${transcript}`);
          // use this to check if the transcribtion output is partial or complete send it to AI only if complete
          //   if (!results[0].IsPartial) {
          //   }
        }
      }
    }
  }
};

const startTranscribe = async function () {
  try {
    await StreamAudioToHttp2();
    process.exit(0);
  } catch (error) {
    console.log('Streaming error: ', error);
    process.exit(1);
  }
};

startTranscribe();
