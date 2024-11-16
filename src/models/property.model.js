import mongoose from "mongoose";

const { Schema } = mongoose;

const imageGallerySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const amenitiesSchema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    iconUrl:{
      type: String,
      required: true
    }
  },
  { _id: false }
);

const guideListSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    distance: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const localityGuideSchema = new Schema(
  {
    key: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: true,
    },
    guideList: [guideListSchema],
  },
  { _id: false }
);

const floorPlanSchema = new Schema(
  {
    price: {
      type: String,
      required: true,
    },
    superArea: {
      type: String,
      required: false,
    },
    carpetArea: {
      type: String,
    },
    configuration: {
      type: String,
      required: false,
    },
    floorImg: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const propertySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            index: true,
        },
        slug: {
          type: String
        },
        metaTitle: {
            type: String,
        },
        metaDescription: {
            type: String,
        },
        metaKeywords: {
            type: String,
        },
        subLocality: {
            type: Schema.Types.ObjectId,
            ref: "SubLocality",
        },
        locality: {
            type: Schema.Types.ObjectId,
            ref: "Locality",
        },
        city: {
            type: Schema.Types.ObjectId,
            ref: "City",
        },
        state: {
            type: Schema.Types.ObjectId,
            ref: "State",
        },
        startingPrice: {
            type: String,
        },
        featured: {
            type: Boolean,

        },
        exclusive: {
            type: Boolean,

        },
        priority: {
            type: String,
            required: true,
        },
        configuration: {
            type: String,
        },
        description: [
            {
                type: String,
            },
        ],
        keyHighlights: [
            {
                type: String,
            },
        ],
        area: {
            type: String,
        },
        squarePrice: {
            type: String,
        },
        status: {
            type: String,
        },
        displayLocality: {
            type: Boolean,
        },
        amenities: {
            type: [amenitiesSchema],
            required: true,
            validate: {
                validator: function (v) {
                    return v && v.length > 0;
                },
                message: 'Amenities cannot be empty',
            }
        } ,
        exclusiveAmenities: {
            type: [amenitiesSchema],
            required: true,
            validate: {
                validator: function (v) {
                    return v && v.length > 0;
                },
                message: 'Exclusive amenities cannot be empty',
            }
        },
        localityGuide: {
            type: [localityGuideSchema],
            required: true,
            validate: {
                validator: function (v) {
                    return v && v.length > 0;
                },
                message: 'Locality Guide cannot be empty',
            }
        },
        floorPlan: {
            type: [floorPlanSchema],
            required: true,
            validate: {
                validator: function (v) {
                    return v && v.length > 0;
                },
                message: 'Floor Plan cannot be empty',
            }
        },
        imageGallery: [imageGallerySchema],
        brochure: {
            type: [String],
        },
        videoUrl:{
          type: [String]
        },
        developer: {
            type: Schema.Types.ObjectId,
            ref: "Developer",
        },
        propertyLogo: {
            type: [String],
        },
        rera: {
            type: String,
        },
        possesion: {
            type: String,
        },
        coordinates: {
            lat: Number,
            lng: Number,
        },
        tagLine: {
            type: String,
        },
        priceInFigure: {
            type: Number,
        },
        propertyType: {
            title: String,
            subType: [String],
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

propertySchema.index({ name: 1 });

export const Property = mongoose.model("Property", propertySchema);
