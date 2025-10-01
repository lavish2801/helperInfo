const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5100;


// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// MongoDB Atlas Connection
const MONGODB_URI = process.env.MONGODB_URI ;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB Atlas');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Mongoose Models

// helperInfo Model
const helperInfoSchema = new mongoose.Schema({
  helper_name: {
    type: String,
    required: false,
    trim: true
  },
  category: {
    type: [String],
    default: [],
    required: false,
    enum: ['COOK', 'MAID', 'DRIVER', 'ELDERLY CARE', 'BABY CARE', 'BROKER', 'DOG CARE']
  },
  phone_number: {
    type: String,
    required: false
  },
  locations: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// // userInfo Model
// const userInfoSchema = new mongoose.Schema({
//   type: {
//     type: String,
//     required: true,
//     enum: ['services', 'careers']
//   },
//   headline: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   content: {
//     type: String,
//     required: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// Create Models
const HelperInfo = mongoose.model('helperInfo', helperInfoSchema);
// const userInfo = mongoose.model('userInfo', userInfoSchema);

// Routes

// Health Check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Helper Info API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Content Routes (Products, Ad Images, Banners)
app.get('/api/helperInfo', async (req, res) => {
  try {
    // read from query: locations and category can be string or array
    const { locations, category } = req.query;

    // normalize to arrays of uppercase strings
    const toArrayUpper = (value) => {
      if (value === undefined) return [];
      if (Array.isArray(value)) return value.map(v => String(v).trim().toUpperCase()).filter(Boolean);
      if (typeof value === 'string' && value.includes(',')) return value.split(',').map(v => v.trim().toUpperCase()).filter(Boolean);
      return [String(value).trim().toUpperCase()].filter(Boolean);
    };

    const locationTerms = toArrayUpper(locations);
    const categoryTerms = toArrayUpper(category);

    const query = {};
    if (locationTerms.length > 0) {
      // match any of the selected locations (OR semantics)
      query.locations = { $in: locationTerms };
    }
    if (categoryTerms.length > 0) {
      // match any of the selected categories
      query.category = { $in: categoryTerms };
    }

    const results = await HelperInfo.find(query).sort({ createdAt: -1 });
    res.json(results || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/helperInfo', async (req, res) => {
  try {
   const { helper_name, category, phone_number, locations } = req.body;

   const normalizeArrayUpper = (value) => {
     if (value === undefined || value === null) return [];
     if (Array.isArray(value)) return value.map(v => String(v).trim().toUpperCase()).filter(Boolean);
     if (typeof value === 'string' && value.includes(',')) return value.split(',').map(v => v.trim().toUpperCase()).filter(Boolean);
     return [String(value).trim().toUpperCase()].filter(Boolean);
   };

   const helperDoc = new HelperInfo({
     helper_name: helper_name ? String(helper_name).trim().toUpperCase() : undefined,
     category: normalizeArrayUpper(category),
     phone_number,
     locations: normalizeArrayUpper(locations)
   });

   await helperDoc.save();
   res.status(201).json(helperDoc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// app.delete('/api/content/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Product.deleteOne({ _id: id });
//     res.json({ message: 'Content deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler (avoid wildcard '*' to prevent path-to-regexp errors)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}`);
});

module.exports = app;
