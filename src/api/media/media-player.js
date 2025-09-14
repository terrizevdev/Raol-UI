import express from 'express'
import { createApiKeyMiddleware } from '../../middleware/apikey.js'

const router = express.Router()

const musicPlayers = [
  {
    name: "Spotify",
    type: "streaming",
    description: "Popular music streaming platform",
    url: "https://open.spotify.com",
    features: ["playlists", "discover", "podcasts", "offline"],
    supported_formats: ["mp3", "aac", "ogg"]
  },
  {
    name: "Apple Music",
    type: "streaming", 
    description: "Apple's music streaming service",
    url: "https://music.apple.com",
    features: ["lossless", "spatial_audio", "radio", "library"],
    supported_formats: ["aac", "alac", "mp3"]
  },
  {
    name: "YouTube Music",
    type: "streaming",
    description: "Google's music streaming platform",
    url: "https://music.youtube.com",
    features: ["video_integration", "playlists", "discover", "offline"],
    supported_formats: ["mp4", "webm", "aac"]
  },
  {
    name: "SoundCloud",
    type: "streaming",
    description: "Platform for discovering and sharing music",
    url: "https://soundcloud.com",
    features: ["user_uploads", "discover", "social", "free_tier"],
    supported_formats: ["mp3", "wav", "flac"]
  },
  {
    name: "Bandcamp",
    type: "streaming",
    description: "Platform for independent artists",
    url: "https://bandcamp.com",
    features: ["direct_support", "lossless", "physical_merch", "discover"],
    supported_formats: ["flac", "mp3", "aac", "alac"]
  },
  {
    name: "Tidal",
    type: "streaming",
    description: "High-fidelity music streaming",
    url: "https://tidal.com",
    features: ["lossless", "master_quality", "exclusive_content", "artist_payouts"],
    supported_formats: ["flac", "mqa", "aac"]
  },
  {
    name: "Amazon Music",
    type: "streaming",
    description: "Amazon's music streaming service",
    url: "https://music.amazon.com",
    features: ["prime_integration", "alexa", "hd_ultra_hd", "podcasts"],
    supported_formats: ["mp3", "aac", "flac"]
  },
  {
    name: "Deezer",
    type: "streaming",
    description: "French music streaming platform",
    url: "https://deezer.com",
    features: ["flow", "lyrics", "lossless", "radio"],
    supported_formats: ["mp3", "flac", "aac"]
  },
  {
    name: "Pandora",
    type: "streaming",
    description: "Music discovery and radio platform",
    url: "https://pandora.com",
    features: ["radio_stations", "discovery", "personalized", "podcasts"],
    supported_formats: ["aac", "mp3"]
  },
  {
    name: "iHeartRadio",
    type: "streaming",
    description: "Radio and music streaming platform",
    url: "https://iheart.com",
    features: ["live_radio", "podcasts", "playlists", "local_stations"],
    supported_formats: ["aac", "mp3"]
  },
  {
    name: "VLC Media Player",
    type: "desktop",
    description: "Free and open-source media player",
    url: "https://www.videolan.org/vlc/",
    features: ["cross_platform", "codec_support", "streaming", "conversion"],
    supported_formats: ["mp3", "flac", "aac", "ogg", "wav", "m4a", "wma"]
  },
  {
    name: "Foobar2000",
    type: "desktop",
    description: "Advanced audio player for Windows",
    url: "https://www.foobar2000.org/",
    features: ["customizable", "plugins", "tagging", "conversion"],
    supported_formats: ["mp3", "flac", "aac", "ogg", "wav", "m4a", "wma", "ape"]
  },
  {
    name: "Winamp",
    type: "desktop",
    description: "Classic Windows media player",
    url: "https://www.winamp.com/",
    features: ["skins", "plugins", "visualizations", "playlists"],
    supported_formats: ["mp3", "wav", "aac", "ogg", "wma"]
  },
  {
    name: "Audacious",
    type: "desktop",
    description: "Lightweight audio player for Linux",
    url: "https://audacious-media-player.org/",
    features: ["lightweight", "plugins", "cross_platform", "gapless"],
    supported_formats: ["mp3", "flac", "aac", "ogg", "wav", "m4a"]
  },
  {
    name: "Clementine",
    type: "desktop",
    description: "Modern music player and library organizer",
    url: "https://www.clementine-player.org/",
    features: ["library_management", "lastfm", "spotify", "cloud_storage"],
    supported_formats: ["mp3", "flac", "aac", "ogg", "wav", "m4a"]
  },
  {
    name: "MusicBee",
    type: "desktop",
    description: "Music manager and player for Windows",
    url: "https://getmusicbee.com/",
    features: ["library_management", "tagging", "sync", "plugins"],
    supported_formats: ["mp3", "flac", "aac", "ogg", "wav", "m4a", "wma", "ape"]
  },
  {
    name: "AIMP",
    type: "desktop",
    description: "Free audio player and organizer",
    url: "https://www.aimp.ru/",
    features: ["skins", "plugins", "conversion", "radio"],
    supported_formats: ["mp3", "flac", "aac", "ogg", "wav", "m4a", "wma", "ape"]
  },
  {
    name: "MediaMonkey",
    type: "desktop",
    description: "Music manager and player",
    url: "https://www.mediamonkey.com/",
    features: ["library_management", "sync", "conversion", "podcasts"],
    supported_formats: ["mp3", "flac", "aac", "ogg", "wav", "m4a", "wma"]
  },
  {
    name: "JRiver Media Center",
    type: "desktop",
    description: "Professional media management software",
    url: "https://www.jriver.com/",
    features: ["professional", "hifi", "theater", "conversion"],
    supported_formats: ["mp3", "flac", "aac", "ogg", "wav", "m4a", "wma", "dsd"]
  },
  {
    name: "Roon",
    type: "desktop",
    description: "High-end music player and library manager",
    url: "https://roonlabs.com/",
    features: ["hifi", "multi_room", "metadata", "tidal_qobuz"],
    supported_formats: ["flac", "dsd", "mp3", "aac", "m4a"]
  }
]

router.get('/players', createApiKeyMiddleware(), (req, res) => {
  try {
    const { type, format, feature } = req.query
    
    let filteredPlayers = musicPlayers
    
    if (type) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.type.toLowerCase() === type.toLowerCase()
      )
    }
    
    if (format) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.supported_formats.some(f => f.toLowerCase() === format.toLowerCase())
      )
    }
    
    if (feature) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.features.some(f => f.toLowerCase().includes(feature.toLowerCase()))
      )
    }
    
    res.json({
      status: true,
      total: filteredPlayers.length,
      players: filteredPlayers,
      filters: {
        available_types: [...new Set(musicPlayers.map(p => p.type))],
        available_formats: [...new Set(musicPlayers.flatMap(p => p.supported_formats))],
        available_features: [...new Set(musicPlayers.flatMap(p => p.features))]
      }
    })
  } catch (error) {
    res.status(500).json({
      status: false,
      error: "Internal server error",
      message: "Failed to fetch music players"
    })
  }
})

router.get('/players/:name', createApiKeyMiddleware(), (req, res) => {
  try {
    const { name } = req.params
    const player = musicPlayers.find(p => 
      p.name.toLowerCase() === name.toLowerCase()
    )
    
    if (!player) {
      return res.status(404).json({
        status: false,
        error: "Player not found",
        message: `No music player found with name: ${name}`
      })
    }
    
    res.json({
      status: true,
      player: player
    })
  } catch (error) {
    res.status(500).json({
      status: false,
      error: "Internal server error",
      message: "Failed to fetch player details"
    })
  }
})

router.get('/formats', createApiKeyMiddleware(), (req, res) => {
  try {
    const formats = [...new Set(musicPlayers.flatMap(p => p.supported_formats))]
    
    const formatInfo = {
      "mp3": "MPEG Audio Layer 3 - Most common audio format",
      "flac": "Free Lossless Audio Codec - Uncompressed audio",
      "aac": "Advanced Audio Coding - Apple's preferred format",
      "ogg": "Ogg Vorbis - Open source audio format",
      "wav": "Waveform Audio File Format - Uncompressed audio",
      "m4a": "MPEG-4 Audio - Apple's audio container",
      "wma": "Windows Media Audio - Microsoft's format",
      "ape": "Monkey's Audio - Lossless compression",
      "dsd": "Direct Stream Digital - High-resolution audio",
      "alac": "Apple Lossless Audio Codec - Apple's lossless format",
      "webm": "WebM Audio - Web-optimized format",
      "mqa": "Master Quality Authenticated - High-resolution streaming"
    }
    
    const formatsWithInfo = formats.map(format => ({
      format,
      description: formatInfo[format] || "Audio format",
      players_supporting: musicPlayers.filter(p => p.supported_formats.includes(format)).length
    }))
    
    res.json({
      status: true,
      total_formats: formats.length,
      formats: formatsWithInfo
    })
  } catch (error) {
    res.status(500).json({
      status: false,
      error: "Internal server error",
      message: "Failed to fetch audio formats"
    })
  }
})

export default router