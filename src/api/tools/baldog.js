import axios from "axios"
import { createApiKeyMiddleware } from "../../middleware/apikey.js"

export default (app) => {
  app.post("/tools/baldog", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.body.text
      
      if (!text) {
        return res.status(400).json({ 
          status: false, 
          error: "text is required" 
        })
      }
      
      res.status(200).json({
        status: true,
        message: "hama ygy",
        endpoint: "/tools/baldog",
        method: "POST",
        required_parameters: {
          "text": "Hello World"
        },
        
        example: {
          url: "https://your-domain.com/tools/baldog?text=Hello World",
          method: "POST",
          body: {
            "text": "Hello World"
          }
        }
      })
      
    } catch (error) {
      console.error("tools/baldog API Error:", error)
      res.status(500).json({ 
        status: false, 
        error: error.message || "Internal server error" 
      })
    }
  })
}