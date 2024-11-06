const RLECodec = require("./RLECodec");
const SchannonFanoCodec = require("./SchannonFanoCodec");

const RLE_CODEC = 'rle'
const SCHANNON_FANO_CODEC = 'schannon-fano'

const CODECS = [
  RLE_CODEC,
  SCHANNON_FANO_CODEC,
]

const CODEC_MAP = {
  [RLE_CODEC]: RLECodec,
  [SCHANNON_FANO_CODEC]: SchannonFanoCodec,
}

module.exports = {
  RLECodec,
  SCHANNON_FANO_CODEC,
  CODECS,
  CODEC_MAP,
}