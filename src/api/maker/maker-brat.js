import axios from "axios"

export default (app) => {
  async function generateBratImage(text, background = null, color = null) {
    try {
      // Prepare the request parameters
      const params = new URLSearchParams()
      params.append("text", text)

      if (background) {
        params.append("background", background)
      }

      if (color) {
        params.append("color", color)
      }

      // Make request to BRAT API
      const response = await axios.get(`https://raolbyte-brat.hf.space/maker/brat?${params.toString()}`, {
        timeout: 30000, // 30 second timeout
        headers: {
          "User-Agent": "Raol-APIs/2.0.0",
        },
      })

      // Check if response contains image_url
      if (response.data && response.data.image_url) {
        // Download the actual image
        const imageResponse = await axios.get(response.data.image_url, {
          responseType: "arraybuffer",
          timeout: 30000,
          headers: {
            "User-Agent": "Raol-APIs/2.0.0",
          },
        })

        return Buffer.from(imageResponse.data)
      } else {
        throw new Error("Invalid response from BRAT API")
      }
    } catch (error) {
      console.error("Error generating BRAT image:", error)

      if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout - BRAT API took too long to respond")
      } else if (error.response) {
        throw new Error(`BRAT API error: ${error.response.status} - ${error.response.statusText}`)
      } else if (error.request) {
        throw new Error("Network error - Could not reach BRAT API")
      } else {
        throw new Error(`BRAT generation failed: ${error.message}`)
      }
    }
  }

  async function generateBratVideo(text, background = null, color = null) {
    try {
      // Prepare the request parameters
      const params = new URLSearchParams()
      params.append("text", text)

      if (background) {
        params.append("background", background)
      }

      if (color) {
        params.append("color", color)
      }

      // Make request to BRATVID API
      const response = await axios.get(`https://raolbyte-brat.hf.space/maker/bratvid?${params.toString()}`, {
        timeout: 60000, // 60 second timeout for video generation
        headers: {
          "User-Agent": "Raol-APIs/2.0.0",
        },
      })

      // Check if response contains video_url
      if (response.data && response.data.video_url) {
        // Download the actual video
        const videoResponse = await axios.get(response.data.video_url, {
          responseType: "arraybuffer",
          timeout: 60000,
          headers: {
            "User-Agent": "Raol-APIs/2.0.0",
          },
        })

        return Buffer.from(videoResponse.data)
      } else {
        throw new Error("Invalid response from BRATVID API")
      }
    } catch (error) {
      console.error("Error generating BRAT video:", error)

      if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout - BRATVID API took too long to respond")
      } else if (error.response) {
        throw new Error(`BRATVID API error: ${error.response.status} - ${error.response.statusText}`)
      } else if (error.request) {
        throw new Error("Network error - Could not reach BRATVID API")
      } else {
        throw new Error(`BRATVID generation failed: ${error.message}`)
      }
    }
  }

  // BRAT Image Generator
  app.get("/maker/brat", async (req, res) => {
    try {
      const { text, background, color } = req.query

      // Validate required parameter
      if (!text) {
        return res.status(400).json({
          status: false,
          error: "Missing required parameter",
          message: "The 'text' parameter is required",
        })
      }

      // Validate text length
      if (text.length > 500) {
        return res.status(400).json({
          status: false,
          error: "Text too long",
          message: "Text must be 500 characters or less",
        })
      }

      // Validate color format if provided
      if (background && !/^#[0-9A-Fa-f]{6}$/.test(background)) {
        return res.status(400).json({
          status: false,
          error: "Invalid background color",
          message: "Background color must be in hex format (e.g., #000000)",
        })
      }

      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({
          status: false,
          error: "Invalid text color",
          message: "Text color must be in hex format (e.g., #FFFFFF)",
        })
      }

      // Generate the BRAT image
      const imageBuffer = await generateBratImage(text, background, color)

      // Set appropriate headers for image response
      res.setHeader("Content-Type", "image/png")
      res.setHeader("Content-Length", imageBuffer.length)
      res.setHeader("Cache-Control", "public, max-age=3600") // Cache for 1 hour
      res.setHeader("Content-Disposition", `inline; filename="brat_${Date.now()}.png"`)

      // Send the image buffer
      res.end(imageBuffer)
    } catch (error) {
      console.error("BRAT API Error:", error)

      res.status(500).json({
        status: false,
        error: "Image generation failed",
        message: error.message || "Failed to generate BRAT image",
      })
    }
  })

  // BRAT Video Generator
  app.get("/maker/bratvid", async (req, res) => {
    try {
      const { text, background, color } = req.query

      // Validate required parameter
      if (!text) {
        return res.status(400).json({
          status: false,
          error: "Missing required parameter",
          message: "The 'text' parameter is required",
        })
      }

      // Validate text length
      if (text.length > 500) {
        return res.status(400).json({
          status: false,
          error: "Text too long",
          message: "Text must be 500 characters or less",
        })
      }

      // Validate color format if provided
      if (background && !/^#[0-9A-Fa-f]{6}$/.test(background)) {
        return res.status(400).json({
          status: false,
          error: "Invalid background color",
          message: "Background color must be in hex format (e.g., #000000)",
        })
      }

      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({
          status: false,
          error: "Invalid text color",
          message: "Text color must be in hex format (e.g., #FFFFFF)",
        })
      }

      // Generate the BRAT video
      const videoBuffer = await generateBratVideo(text, background, color)

      // Set appropriate headers for video response
      res.setHeader("Content-Type", "video/mp4")
      res.setHeader("Content-Length", videoBuffer.length)
      res.setHeader("Cache-Control", "public, max-age=3600") // Cache for 1 hour
      res.setHeader("Content-Disposition", `inline; filename="bratvid_${Date.now()}.mp4"`)
      res.setHeader("Accept-Ranges", "bytes")

      // Send the video buffer
      res.end(videoBuffer)
    } catch (error) {
      console.error("BRATVID API Error:", error)

      res.status(500).json({
        status: false,
        error: "Video generation failed",
        message: error.message || "Failed to generate BRAT video",
      })
    }
  })
}
