import { Types } from "mongoose";
import type { ProductType } from "../models/productModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import type { Request, Response } from "express";
import type { AddressType } from "../models/addressModel.js";
import type { ImageGroup } from "../models/imageModel.js";
import type { CoordsType } from "../models/coordinatesSchema.js";

interface ProductResponseBody {
  createdProduct?: ProductType | null;
  msg: string;
}

interface ProductWithUserId extends ProductType {
  id: string;
  userId?: string;
  addressline1: string;
  addressline2?: string;
  village?: string;
  city: string;
  district: string;
  state: string;
  pincode: number;
  imageGroups: ImageGroup[];
  existingPhotos:any;
   videos?:string[];
}

interface ProductInput {
  propertyname: string;
  propertytype: string;
  propertysubtype: string;
  description: string;
  price: number;
  newfield?:string;
  typeofaccomodation: string | string[];
  amenities: string | string[];
  address: AddressType;
  area?: number;
  owner: Types.ObjectId | string;
  coordinates: CoordsType;
  photos: ImageGroup[];
  videos?:string[];
}

const productRegister = async (
  req: Request<{}, {}, ProductWithUserId>,
  res: Response<ProductResponseBody>
): Promise<Response<ProductResponseBody>> => {
  try {
    const _id = req.userId;
    if (!_id) {
      return res.status(400).json({ msg: "userId is missing" });
    }

    const imageGroups = req.body.imageGroups;
    console.log("abcd", imageGroups);

    const photos = imageGroups;

    const {
      propertyname,
      propertytype,
      propertysubtype,
      description,
      price,
      typeofaccomodation,
      amenities,
      addressline1,
      addressline2,
      city,
      district,
      newfield,
      pincode,
      state,
      videos,
      village,
      area,
      coordinates,
    } = req.body;
    const cleanDescription = description
    ?.trim()
    ?.replace(/\r\n/g, '\n')  
    ?.replace(/\r/g, '\n'); 
    const numericArea = area ? Number(area) : undefined;
    const numericPrice = price ? Number(price) : undefined;

    const productData: ProductInput = {
      propertyname,
      propertytype,
      propertysubtype,
      newfield,
      description: cleanDescription,
      price: numericPrice!,
      typeofaccomodation:
        typeof typeofaccomodation === "string"
          ? JSON.parse(typeofaccomodation)
          : typeofaccomodation,
      amenities:
        typeof amenities === "string" ? JSON.parse(amenities) : amenities,
      address: {
        addressline1,
        addressline2,
        city,
        district,
        pincode,
        state,
        village,
      },
      area: numericArea,
      owner: _id,
      coordinates:
        typeof coordinates === "string" ? JSON.parse(coordinates) : coordinates,
      photos,
      videos: videos || [],
    };

    const product = new Product(productData);
    await product.save();

    await User.findByIdAndUpdate(_id, { $push: { product: product._id } });
    console.log("abcdproduct",product);
    
    return res
      .status(201)
      .json({ createdProduct: product, msg: "Property added successfully" });
  } catch (error) {
    console.error("Errro in adding property");
    return res.status(500).json({ msg: "Internal error" });
  }
};


interface ProductUpdateResponseBody {
  updatedProduct?: ProductType | null;
  msg: string;
}

const productUpdate = async (
  req: Request<{}, {}, Partial<ProductWithUserId>>,
  res: Response<ProductUpdateResponseBody>
): Promise<Response<ProductUpdateResponseBody>> => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ msg: "userId is missing" });
    }
    // console.log("ab6cd", imageGroups);


    const productId = req.body.id;
    const updateFields = { ...req.body };
// console.log("rew",req.body);

    if (typeof updateFields.price === "string") {
      updateFields.price = Number(updateFields.price);
    }

    if (typeof updateFields.area === "string") {
      updateFields.area = Number(updateFields.area);
    }

    if (typeof updateFields.typeofaccomodation === "string") {
      updateFields.typeofaccomodation = JSON.parse(updateFields.typeofaccomodation);
    }

    if (typeof updateFields.amenities === "string") {
      updateFields.amenities = JSON.parse(updateFields.amenities);
    }

    if (typeof updateFields.coordinates === "string") {
      updateFields.coordinates = JSON.parse(updateFields.coordinates);
    }

    if (updateFields.address && typeof updateFields.address === "string") {
      updateFields.address = JSON.parse(updateFields.address);
    }

    let photos: any[] = [];

    if(updateFields.existingPhotos && Array.isArray(updateFields.existingPhotos)){
      const currentProduct = await Product.findOne({_id:productId,owner:userId})
      // console.log("currentProduct",currentProduct);
      
      if(currentProduct && currentProduct.photos ){
        photos = currentProduct.photos.filter((photo:any)=>updateFields.existingPhotos.includes(photo._id.toString()));
      //  console.log('phorsd',photos);
       
      }
    }

    if(updateFields.imageGroups && Array.isArray(updateFields.imageGroups) ){
      const newPhotos = updateFields.imageGroups.map((group:any)=>({
        id:group.id,
        images:group.images
      }))

     photos = photos.concat(newPhotos)
    }
    // console.log("photos",photos);

   if (photos.length > 0) {
      updateFields.photos = photos;
    }
  delete updateFields.existingPhotos;
  delete updateFields.imageGroups;

    const updatedProduct:any = await Product.findOneAndUpdate(
      { _id: productId ,owner: userId },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ msg: "Product not found or unauthorized" });
    }

    return res.status(200).json({ updatedProduct, msg: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product", error);
    return res.status(500).json({ msg: "Internal error" });
  }
};


const deleteProduct = async(req:Request<any>,res:Response<any>):Promise<any> =>{
  const userId = req.userId;
  const _id = req.query.id;
  try {
    await Product.findOneAndDelete({_id,owner:userId}); 
    res.status(200).json({msg:"Product deleted successfully"});
  } catch (error) {
     return res.status(400).json({msg:"Product not deleted"})
  }
  
}

const changeAvailStatus = async(req:Request<any>,res:Response<any>):Promise<any> =>{
    try {
  const _id = req.query.id;
   const updatedProduct =  await Product.findOneAndUpdate({_id},{$set:{availStatus:"available"}},{new:true});
   if(!updatedProduct){
    return res.status(404).json({msg:'Product not updated'})
   } 
    res.status(200).json({msg:"Product deleted successfully"});
  } catch (error) {
     return res.status(400).json({msg:"Product not deleted"})
  }
  
}


const updateAvailStatus = async(req:Request<any>,res:Response<any>):Promise<any> =>{
    try {
  const userId = req.userId;
  const _id = req.query.id;
  const status = req.query.status;
  if (!userId || !_id || !status) {
      return res.status(400).json({msg:"Missing values"})
  }
   const updatedProduct =  await Product.findOneAndUpdate({_id,owner:userId},{$set:{availStatus:status}},{new:true});
   if(!updatedProduct){
    return res.status(404).json({msg:'Product not updated'})
   } 
    res.status(200).json({msg:"Product deleted successfully"});
  } catch (error) {
     return res.status(400).json({msg:"Product not deleted"})
  }
  
}





interface ProductQueryParams {
  page?: string;
  limit?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  propertytype?: 'flat' | 'pg' | 'all';
  propertysubtype?: string; // comma-separated values
  priceRanges?: string; // comma-separated price range keys
  typeofaccomodation?: string; // comma-separated accommodation types
  availStatus?: string;
}
interface PaginatedProductResponse {
  products?: any[];
  totalPages?: number;
  totalCount?: number;
  msg: string;
}

const allProduct = async (
  req: Request<{}, PaginatedProductResponse, {}, ProductQueryParams>,
  res: Response<PaginatedProductResponse>
): Promise<Response<PaginatedProductResponse>> => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    // Extract query parameters
    const {
      sortBy = 'newest',
      propertytype,
      propertysubtype,
      priceRanges,
      typeofaccomodation
    } = req.query;

    // Build filter query
    const filterQuery: any = {
      availStatus: 'available'
    };

    // Property type filter
    if (propertytype && propertytype !== 'all') {
      filterQuery.propertytype = propertytype;
    }

    // Property subtype filter (multiple values)
    if (propertysubtype) {
      const subtypes = propertysubtype.split(',').map(s => s.trim());
      if (subtypes.length > 0) {
        filterQuery.propertysubtype = { $in: subtypes };
      }
    }

    // Price range filter
    if (priceRanges && priceRanges !== 'all') {
      const ranges = priceRanges.split(',').map(r => r.trim());
      const priceConditions: any[] = [];

      // Define price range mappings
      const priceRangeMap: { [key: string]: { min: number; max: number } } = {
        'under5000': { min: 0, max: 5000 },
        '5001to10000': { min: 5001, max: 10000 },
        '10001to20000': { min: 10001, max: 20000 },
        '20001to40000': { min: 20001, max: 40000 },
        '40001to80000': { min: 40001, max: 80000 },
        'over80000': { min: 80001, max: 10000000 }
      };

      ranges.forEach(rangeKey => {
        const range = priceRangeMap[rangeKey];
        if (range) {
          priceConditions.push({
            price: { $gte: range.min, $lte: range.max }
          });
        }
      });

      if (priceConditions.length > 0) {
        filterQuery.$or = priceConditions;
      }
    }

    if (typeofaccomodation && typeofaccomodation !== 'all') {
      const accommodationTypes = typeofaccomodation.split(',').map(a => a.trim());
     if (accommodationTypes.includes('only Girls')) {
    filterQuery.typeofaccomodation = {
      $size: 1,                 
      $all: ["Girls"]             
    };
  } else if (accommodationTypes.length === 1) {
    filterQuery.typeofaccomodation = accommodationTypes[0];
  } else {
    filterQuery.typeofaccomodation = { $in: accommodationTypes };
  }
}

    // Build sort query
    let sortQuery: any = { createdAt: -1 }; // default: newest

    switch (sortBy) {
      case 'price_asc':
        sortQuery = { price: 1 };
        break;
      case 'price_desc':
        sortQuery = { price: -1 };
        break;
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
    }

    console.log('Filter Query:', JSON.stringify(filterQuery, null, 2));
    console.log('Sort Query:', sortQuery);

    // Execute query
    const [products, totalCount] = await Promise.all([
      Product.find(filterQuery, {
        "address.addressline1": 1,
        "address.city": 1,
        "address.district": 1,
        "address.state": 1,
        "address.pincode": 1,
        "address._id": 1,
        "propertyname": 1,
        "price": 1,
        "propertytype": 1,
        "typeofaccomodation": 1,
        "propertysubtype": 1,
        "photos": { $slice: 1 }
      })
        .sort(sortQuery)
        .skip(offset)
        .limit(limit)
        .lean(),
      Product.countDocuments(filterQuery)
    ]);

    if (!products || products.length === 0) {
      return res.status(200).json({ 
        products: [],
        totalPages: 0,
        totalCount: 0,
        msg: "No products found matching the filters"
      });
    }

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      products: products,
      totalPages,
      totalCount,
      msg: "Products displayed successfully"
    });

  } catch (error) {
    console.error('Error in allProduct:', error);
    return res.status(500).json({ msg: "Error in finding products" });
  }
};

const allNotAvailableProduct = async (
  req: Request<{}, PaginatedProductResponse, {}, ProductQueryParams>,
  res: Response<PaginatedProductResponse>
): Promise<Response<PaginatedProductResponse>> => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    // Extract query parameters
    const {
      sortBy = 'newest',
      propertytype,
      propertysubtype,
      priceRanges,
      typeofaccomodation
    } = req.query;

    // Build filter query
    const filterQuery: any = {
      availStatus: 'notavailable'
    };

    // Property type filter
    if (propertytype && propertytype !== 'all') {
      filterQuery.propertytype = propertytype;
    }

    // Property subtype filter (multiple values)
    if (propertysubtype) {
      const subtypes = propertysubtype.split(',').map(s => s.trim());
      if (subtypes.length > 0) {
        filterQuery.propertysubtype = { $in: subtypes };
      }
    }

    // Price range filter
    if (priceRanges && priceRanges !== 'all') {
      const ranges = priceRanges.split(',').map(r => r.trim());
      const priceConditions: any[] = [];

      // Define price range mappings
      const priceRangeMap: { [key: string]: { min: number; max: number } } = {
        'under5000': { min: 0, max: 5000 },
        '5001to10000': { min: 5001, max: 10000 },
        '10001to20000': { min: 10001, max: 20000 },
        '20001to40000': { min: 20001, max: 40000 },
        '40001to80000': { min: 40001, max: 80000 },
        'over80000': { min: 80001, max: 10000000 }
      };

      ranges.forEach(rangeKey => {
        const range = priceRangeMap[rangeKey];
        if (range) {
          priceConditions.push({
            price: { $gte: range.min, $lte: range.max }
          });
        }
      });

      if (priceConditions.length > 0) {
        filterQuery.$or = priceConditions;
      }
    }

    if (typeofaccomodation && typeofaccomodation !== 'all') {
      const accommodationTypes = typeofaccomodation.split(',').map(a => a.trim());
     if (accommodationTypes.includes('only Girls')) {
    filterQuery.typeofaccomodation = {
      $size: 1,                 
      $all: ["Girls"]             
    };
  } else if (accommodationTypes.length === 1) {
    filterQuery.typeofaccomodation = accommodationTypes[0];
  } else {
    filterQuery.typeofaccomodation = { $in: accommodationTypes };
  }
}

    // Build sort query
    let sortQuery: any = { createdAt: -1 }; // default: newest

    switch (sortBy) {
      case 'price_asc':
        sortQuery = { price: 1 };
        break;
      case 'price_desc':
        sortQuery = { price: -1 };
        break;
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
    }

    console.log('Filter Query:', JSON.stringify(filterQuery, null, 2));
    console.log('Sort Query:', sortQuery);

    // Execute query
    const [products, totalCount] = await Promise.all([
      Product.find(filterQuery, {
        "address.addressline1": 1,
        "address.city": 1,
        "address.district": 1,
        "address.state": 1,
        "address.pincode": 1,
        "address._id": 1,
        "propertyname": 1,
        "price": 1,
        "propertytype": 1,
        "typeofaccomodation": 1,
        "propertysubtype": 1,
        "photos": { $slice: 1 }
      })
        .sort(sortQuery)
        .skip(offset)
        .limit(limit)
        .lean(),
      Product.countDocuments(filterQuery)
    ]);

    if (!products || products.length === 0) {
      return res.status(200).json({ 
        products: [],
        totalPages: 0,
        totalCount: 0,
        msg: "No products found matching the filters"
      });
    }

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      products: products,
      totalPages,
      totalCount,
      msg: "Products displayed successfully"
    });

  } catch (error) {
    console.error('Error in allProduct:', error);
    return res.status(500).json({ msg: "Error in finding products" });
  }
};


interface ProductInputs {
  propertyname: string;
  propertytype: string;
  propertysubtype: string;
  description: string;
  price: number;
  newfield?:string;
  typeofaccomodation: string | string[];
  amenities: string | string[];
  address: AddressType;
  area?: number;
  owner?: Types.ObjectId | string;
  coordinates: CoordsType;
  photos: ImageGroup[];
  views:number;
}


interface ProductDetailResponse {
  product?:ProductInputs|ProductInputs[];
  msg?:string
}

const productDetail = async (
  req: Request<{}, ProductDetailResponse, {}, { id?: string }>,
  res: Response<ProductDetailResponse>
): Promise<Response<ProductDetailResponse>> => {
  const id = req.query.id;
  console.log("ids", id);

  try {
    const data = await Product.findOneAndUpdate(
      { _id: id },
      { $inc: { views: 1 } },
      { new: true }
    ).populate({
      path: "owner",
      select: 'product username email phone -_id',
      populate: {
        path: 'product',
        select: {
          "address.addressline1": 1,
          "address.city": 1,
          "address.district": 1,
          "address.state": 1,
          "address.pincode": 1,
          'address._id': 1,
          "propertyname": 1,
          "price": 1,
          "propertytype": 1,
          
          "typeofaccomodation": 1,
          'propertysubtype': 1,
          "photos": { $slice: 1 }
        }
      }
    });

    if (data) {
      console.log("hi",data);
      return res.status(200).json({ product: data, msg: "Product detailed successfully" });
    } else {
      return res.status(404).json({ msg: "Product not found" });
    }

  } catch (error) {
    return res.status(500).json({ msg: "Error in product fetch" });
  }
};

interface CityProductQueryParams {
  city?: string;
  page?: string;
  limit?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  propertytype?: 'flat' | 'pg' | 'all';
  propertysubtype?: string; // comma-separated values
  priceRanges?: string; // comma-separated price range keys
  typeofaccomodation?: string; // comma-separated accommodation types
}

interface PaginatedProductResponse {
  products?: any[];
  totalPages?: number;
  totalCount?: number;
  msg: string;
}

const getAllCityProduct = async (
  req: Request<{}, PaginatedProductResponse, {}, CityProductQueryParams>,
  res: Response<PaginatedProductResponse>
): Promise<Response<PaginatedProductResponse>> => {
  try {
    const city = req.query.city;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    // Extract query parameters
    const {
      sortBy = 'newest',
      propertytype,
      propertysubtype,
      priceRanges,
      typeofaccomodation
    } = req.query;

    if (!city) {
      return res.status(400).json({ msg: "City parameter is required" });
    }

    console.log("City Query:", city, page, limit, offset);

    // Build filter query
    const filterQuery: any = {
      "address.city": city,
      availStatus: 'available'
    };

    // Property type filter
    if (propertytype && propertytype !== 'all') {
      filterQuery.propertytype = propertytype;
    }

    // Property subtype filter (multiple values)
    if (propertysubtype) {
      const subtypes = propertysubtype.split(',').map(s => s.trim());
      if (subtypes.length > 0) {
        filterQuery.propertysubtype = { $in: subtypes };
      }
    }

    // Price range filter
    if (priceRanges && priceRanges !== 'all') {
      const ranges = priceRanges.split(',').map(r => r.trim());
      const priceConditions: any[] = [];

      // Define price range mappings
      const priceRangeMap: { [key: string]: { min: number; max: number } } = {
        'under5000': { min: 0, max: 5000 },
        '5001to10000': { min: 5001, max: 10000 },
        '10001to20000': { min: 10001, max: 20000 },
        '20001to40000': { min: 20001, max: 40000 },
        '40001to80000': { min: 40001, max: 80000 },
        'over80000': { min: 80001, max: 10000000 }
      };

      ranges.forEach(rangeKey => {
        const range = priceRangeMap[rangeKey];
        if (range) {
          priceConditions.push({
            price: { $gte: range.min, $lte: range.max }
          });
        }
      });

      if (priceConditions.length > 0) {
        filterQuery.$or = priceConditions;
      }
    }


    if (typeofaccomodation && typeofaccomodation !== 'all') {
      const accommodationTypes = typeofaccomodation.split(',').map(a => a.trim());
     if (accommodationTypes.includes('only Girls')) {
    filterQuery.typeofaccomodation = {
      $size: 1,                 
      $all: ["Girls"]             
    };
  } else if (accommodationTypes.length === 1) {
    filterQuery.typeofaccomodation = accommodationTypes[0];
  } else {
    filterQuery.typeofaccomodation = { $in: accommodationTypes };
  }
}


    let sortQuery: any = { createdAt: -1 }; // default: newest

    switch (sortBy) {
      case 'price_asc':
        sortQuery = { price: 1 };
        break;
      case 'price_desc':
        sortQuery = { price: -1 };
        break;
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
    }

    console.log('Filter Query:', JSON.stringify(filterQuery, null, 2));
    console.log('Sort Query:', sortQuery);

    // Execute query
    const [products, totalCount] = await Promise.all([
      Product.find(filterQuery)
        .select({
          "address.addressline1": 1,
          "address.city": 1,
          "address.district": 1,
          "address.state": 1,
          "address.pincode": 1,
          "address._id": 1,
          "propertysubtype": 1,
          "propertyname": 1,
          "typeofaccomodation": 1,
          "price": 1,
          "propertytype": 1,
          "photos": { $slice: 1 },
        })
        .sort(sortQuery)
        .skip(offset)
        .limit(limit)
        .lean(),
      Product.countDocuments(filterQuery)
    ]);

    if (products.length === 0) {
      return res.status(200).json({
        products: [],
        totalPages: 0,
        totalCount: 0,
        msg: "No products found matching the filters in this city"
      });
    }

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      products,
      totalPages,
      totalCount,
      msg: "Products displayed successfully",
    });

  } catch (error) {
    console.error('Error in getAllCityProduct:', error);
    return res.status(500).json({ msg: "Error in product fetch" });
  }
};

export interface NearbyProductType {
  _id: string;
  propertyname: string;
  propertytype: string;
  propertysubtype: string;
  price: number;
  address: {
    addressline1: string;
    addressline2?: string;
    village?: string;
    city: string;
    district: string;
    state: string;
    pincode: number;
  };
  distance: number;
  photos: any;
  typeofaccomodation:any;
}

export interface PaginatedProductRespons {
  products: NearbyProductType[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  msg: string;
}


export interface NearbyProductReques {
  latitude: number;
  longitude: number;
  maxDistance?: number;
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  propertytype?: string;
  propertysubtype?: string; 
  minPrice?: number;
  maxPrice?: number;
  priceRanges?:number;
  typeofaccomodation?: string;
}

const getProductbyCoords = async (
  req: Request<{}, {}, {}, NearbyProductReques>,
  res: Response<PaginatedProductRespons>
): Promise<Response<PaginatedProductRespons>> => {
  try {
    const {
      latitude,
      longitude,
      maxDistance = 25000,
      page = 1,
      limit = 10,
      status = 'uploaded',
      sortBy = 'nearest',
      propertytype,
      propertysubtype,
      minPrice,
      maxPrice,
      priceRanges,
      typeofaccomodation
    } = req.query;


    if (!latitude || !longitude) {
      return res.status(400).json({
        products: [],
        totalPages: 0,
        totalCount: 0,
        currentPage: 1,
        hasNext: false,
        hasPrev: false,
        msg: 'Latitude and longitude are required'
      });
    }

    const pageNum = parseInt(page.toString(), 10);
    const limitNum = parseInt(limit.toString(), 10);
    const skip = (pageNum - 1) * limitNum;

    const lat = parseFloat(latitude.toString());
    const lng = parseFloat(longitude.toString());
    const maxDist = parseInt(maxDistance.toString());

    // Build base query
    const baseQuery: any = { productStatus: status , availStatus:'available' };
    
  if (propertytype && propertytype !== 'all') {
  baseQuery.propertytype = propertytype;
}
  
if (propertysubtype && propertysubtype !== 'all') {
   const propertySubTypes = propertysubtype.toString().split(',');
  baseQuery.propertysubtype = { $in: propertySubTypes };
}

  if (priceRanges) {
      const ranges = priceRanges.toString().split(',');
      const priceConditions = ranges.map(range => {
        // You'll need to define priceRanges on backend too
        const rangeDef = getPriceRangeDefinition(range);
        return rangeDef ? { 
          price: { $gte: rangeDef.min, $lte: rangeDef.max } 
        } : null;
      }).filter(Boolean);
      
      if (priceConditions.length > 0) {
        baseQuery.$or = priceConditions;
      }
    } 
    
    else if (minPrice || maxPrice) {
      baseQuery.price = {};
      if (minPrice) baseQuery.price.$gte = parseInt(minPrice.toString());
      if (maxPrice) baseQuery.price.$lte = parseInt(maxPrice.toString());
    }

    if (typeofaccomodation && typeofaccomodation !== 'all') {
      const accomodationTypes = typeofaccomodation.toString().split(',');
      if (accomodationTypes.length === 1 && accomodationTypes[0] === 'only Girls') {
    baseQuery.typeofaccomodation = {  $size: 1,   $all: ["Girls"]   };
  } else {
      baseQuery.typeofaccomodation = { $in: accomodationTypes };}
    }

    const aggregationPipeline: any[] = [
      { $match: baseQuery },
      {
        $addFields: {
          distance: {
            $sqrt: {
              $add: [
                { $pow: [{ $subtract: ["$coordinates.latitude", lat] }, 2] },
                { $pow: [{ $subtract: ["$coordinates.longitude", lng] }, 2] }
              ]
            }
          }
        }
      },
      {
        $match: {
          distance: { $lte: maxDist / 111320 } // Convert meters to approximate degrees
        }
      },
      { $sort: getSortStage(sortBy) },
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          _id: 1,
          propertyname: 1,
          propertytype: 1,
          propertysubtype: 1,
          typeofaccomodation: 1,
          price: 1,
          address: 1,
          photos:1,
          distance: { $multiply: ["$distance", 111320] }, 
          createdAt: 1
        }
      }
    ];

    // Get total count with the same filters
    const countPipeline = [
      { $match: baseQuery },
      {
        $addFields: {
          distance: {
            $sqrt: {
              $add: [
                { $pow: [{ $subtract: ["$coordinates.latitude", lat] }, 2] },
                { $pow: [{ $subtract: ["$coordinates.longitude", lng] }, 2] }
              ]
            }
          }
        }
      },
      {
        $match: {
          distance: { $lte: maxDist / 111320 }
        }
      },
      { $count: 'totalCount' }
    ];

    const countResult = await Product.aggregate(countPipeline);
    const totalCount = countResult[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limitNum);


    // Execute aggregation
    const products = await Product.aggregate(aggregationPipeline);


    // Format the response
    const formattedProducts: NearbyProductType[] = products.map(product => ({
      _id: product._id.toString(),
      propertyname: product.propertyname,
      propertytype: product.propertytype,
      propertysubtype: product.propertysubtype,
      price: product.price,
      address: product.address,
      typeofaccomodation:product.typeofaccomodation,
      distance: product.distance, 
      photos: product.photos || null
    }));

    return res.status(200).json({
      products: formattedProducts,
      totalPages,
      totalCount,
      currentPage: pageNum,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
      msg: formattedProducts.length === 0 ? 'No products found with the applied filters' : 'Products retrieved successfully'
    });

  } catch (error) {
    console.error('Error in getProductbyCoords:', error);
    return res.status(500).json({
      products: [],
      totalPages: 0,
      totalCount: 0,
      currentPage: 1,
      hasNext: false,
      hasPrev: false,
      msg: 'Error fetching nearby products'
    });
  }
};

function getPriceRangeDefinition(rangeKey: string): { min: number; max: number } | null {
  const ranges = {
    'all': { min: 0, max: 10000000 },
    'under5000': { min: 0, max: 5000 },
    '5001to10000': { min: 5001, max: 10000 },
    '10001to20000': { min: 10001, max: 20000 },
    '20001to40000': { min: 20001, max: 40000 },
    '40001to80000': { min: 40001, max: 80000 },
    'over80000': { min: 80001, max: 10000000 },
  };
  
  return ranges[rangeKey as keyof typeof ranges] || null;
}

// Helper function for sorting
function getSortStage(sortBy: string): any {
  switch (sortBy) {
    case 'price_asc':
      return { price: 1 };
    case 'price_desc':
      return { price: -1 };
    case 'newest':
      return { createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    default:
      return { distance: 1 };
  }
}

export default { productRegister,allNotAvailableProduct,allProduct,productDetail,getAllCityProduct,getProductbyCoords,changeAvailStatus,updateAvailStatus,productUpdate,deleteProduct };
