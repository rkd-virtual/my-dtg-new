from flask import Blueprint, jsonify, request
from datetime import datetime

# Create a blueprint for products routes
products_bp = Blueprint('products', __name__, url_prefix='/api/products')

# Static product data (this will be replaced with database queries later)
PRODUCTS_DATA = [
    {
        "id": 1,
        "name": "76-104-1 Screws (Pack of 25)",
        "partNumber": "SC-761041-25",
        "category": "Hardware",
        "price": "4.99",
        "notes": "Pack of 25 zinc-plated mounting screws suitable for battery racks and enclosures.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894e831973733d97de493de_Adobe%20Express%20-%20file%20(5).png",
        "archived": False
    },
    {
        "id": 2,
        "name": "120W Pure Sine Wave Inverter (12V)",
        "partNumber": "INV-120-12V",
        "category": "Power",
        "price": "89.99",
        "notes": "Continuous 120W pure sine inverter for sensitive electronics. Built-in short-circuit protection.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894e7151231b89cdb8f5037_Adobe%20Express%20-%20file%20(5).png",
        "archived": False
    },
    {
        "id": 3,
        "name": "300W Pure Sine Wave Inverter (24V)",
        "partNumber": "INV-300-24V",
        "category": "Power",
        "price": "179.99",
        "notes": "300W inverter for larger loads. High-efficiency topologies and thermal protection.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894e3b40dfafce164c88999_Adobe%20Express%20-%20file%20(6).png",
        "archived": False
    },
    {
        "id": 4,
        "name": "6ft Power Cord (IEC C13 to 3-Prong)",
        "partNumber": "CORD-IEC-6FT",
        "category": "Accessories",
        "price": "9.50",
        "notes": "Standard 6ft IEC C13 mains cable for chargers and inverters. Heavy duty 14AWG conductors.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6895f3fdc26abd3cc9c3800f_Adobe%20Express%20-%20file%20(5).png",
        "archived": False
    },
    {
        "id": 5,
        "name": "4 Pin DC Power Output Cable",
        "partNumber": "CAB-DC-4PIN",
        "category": "Wiring",
        "price": "12.99",
        "notes": "4-pin male/female DC cable for inverter accessory outputs. 18 AWG, heat-shrink ends.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894e88a87872842fb0ff526_Adobe%20Express%20-%20file%20(1).png",
        "archived": False
    },
    {
        "id": 6,
        "name": "10 AWG Copper Wire - 100ft",
        "partNumber": "WIRE-10AWG-100",
        "category": "Wiring",
        "price": "49.99",
        "notes": "100 ft spool of stranded 10 AWG copper wire, suitable for battery interconnects and DC runs.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894e79983499bb6f022887a_Adobe%20Express%20-%20file%20(1).png",
        "archived": False
    },
    {
        "id": 7,
        "name": "Battery Terminal Connector (Brass)",
        "partNumber": "CONN-BT-50",
        "category": "Wiring",
        "price": "6.25",
        "notes": "Brass terminal connector rated to 50A. Corrosion resistant; M8 bolt mounting.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894e55f869c0feb6ca7f6d3_Adobe%20Express%20-%20file%20(1).png",
        "archived": False
    },
    {
        "id": 8,
        "name": "Battery Cradle / Cart - Heavy Duty",
        "partNumber": "CART-HD-001",
        "category": "Cart",
        "price": "349.00",
        "notes": "Heavy-duty battery cart with lockable swivel casters, reinforced frame and tie-down points.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894f92dff116992f3f147c3_Adobe%20Express%20-%20file.png",
        "archived": False
    },
    {
        "id": 9,
        "name": "48V Battery Charger - 20A",
        "partNumber": "CHRG-48V-20",
        "category": "Power",
        "price": "299.99",
        "notes": "Smart charger for 48V lithium systems with temperature-compensated charging and LCD status.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894e04111c57d713c6049de_Adobe%20Express%20-%20file%20(1).png",
        "archived": False
    },
    {
        "id": 10,
        "name": "Controller Bracket - Universal",
        "partNumber": "BRKT-CTRL-UNI",
        "category": "Mounting",
        "price": "14.99",
        "notes": "Universal mounting bracket for charge controllers and inverters. Powder-coated steel.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894eae024c55e3977305892_Adobe%20Express%20-%20file%20(1).png",
        "archived": False
    },
    {
        "id": 11,
        "name": "Cradle Support Bracket - Right",
        "partNumber": "BRKT-CRADLE-R",
        "category": "Mounting",
        "price": "19.99",
        "notes": "Right-side support bracket for battery cradle assemblies. Fits standard 24\" frames.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894eaade667d4259364e1ee_Adobe%20Express%20-%20file%20(10).png",
        "archived": False
    },
    {
        "id": 12,
        "name": "Screw Pack (M6 x 16, Pack of 50)",
        "partNumber": "SC-M6-16-50",
        "category": "Hardware",
        "price": "7.25",
        "notes": "Pack of 50 M6 x 16mm stainless steel screws. Ideal for mounting brackets and terminals.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894e831973733d97de493de_Adobe%20Express%20-%20file%20(5).png",
        "archived": False
    },
    {
        "id": 13,
        "name": "DC Power Overput Cable - 6 Pin",
        "partNumber": "CAB-DC-6PIN",
        "category": "Wiring",
        "price": "15.50",
        "notes": "6-pin DC output cable for multi-output inverter systems. 12 AWG conductors, molded ends.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894e88a87872842fb0ff526_Adobe%20Express%20-%20file%20(1).png",
        "archived": False
    },
    {
        "id": 14,
        "name": "Fuse Block Assembly - 4 Position",
        "partNumber": "FUSE-BLK-100",
        "category": "Wiring",
        "price": "34.99",
        "notes": "4-position fuse block with cover and busbar, rated to 150A total. Includes mounting hardware.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894fa537b9446c35cd24ac0_Adobe%20Express%20-%20file%20(2).png",
        "archived": False
    },
    {
        "id": 15,
        "name": "Laptop Security Bracket - Universal",
        "partNumber": "BRKT-LAP-UNI",
        "category": "Accessories",
        "price": "24.99",
        "notes": "Universal laptop/security bracket for field laptops. Rubberized contact and keyed lock option.",
        "image": "https://cdn.prod.website-files.com/66311aaf0b687a3a2e1a0550/6894ebd35d0a7289cb0214fe_Adobe%20Express%20-%20file%20(5).png",
        "archived": False
    }
]





# Get all products
@products_bp.route('', methods=['GET'])
def get_all_products():
    """
    Fetch all products
    Returns: JSON with all products (archived ones excluded by default)
    """
    try:
        # Filter out archived products by default
        active_products = [p for p in PRODUCTS_DATA if not p.get('archived', False)]
        
        response = {
            "success": True,
            "message": "Products retrieved successfully",
            "data": {
                "products": active_products
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching products: {str(e)}",
            "data": None,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500


# Get product by ID
@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    """
    Fetch a single product by ID
    Args: product_id (int) - Product ID
    Returns: JSON with product details or 404 if not found
    """
    try:
        product = next((p for p in PRODUCTS_DATA if p['id'] == product_id and not p.get('archived')), None)
        
        if not product:
            return jsonify({
                "success": False,
                "message": f"Product with ID {product_id} not found",
                "data": None,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }), 404
        
        response = {
            "success": True,
            "message": "Product retrieved successfully",
            "data": {
                "product": product
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching product: {str(e)}",
            "data": None,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500


# Get products by category
@products_bp.route('/category/<category_name>', methods=['GET'])
def get_products_by_category(category_name):
    """
    Fetch products by category
    Args: category_name (str) - Product category
    Returns: JSON with products in that category
    """
    try:
        products = [p for p in PRODUCTS_DATA if p['category'] == category_name and not p.get('archived')]
        
        if not products:
            return jsonify({
                "success": False,
                "message": f"No products found in category '{category_name}'",
                "data": None,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }), 404
        
        response = {
            "success": True,
            "message": f"Products in category '{category_name}' retrieved successfully",
            "data": {
                "products": products,
                "category": category_name,
                "count": len(products)
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching products by category: {str(e)}",
            "data": None,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500


# Search products
@products_bp.route('/search', methods=['GET'])
def search_products():
    """
    Search products by name or part number
    Query params: q (search query)
    Returns: JSON with matching products
    """
    try:
        query = request.args.get('q', '').lower()
        
        if not query:
            return jsonify({
                "success": False,
                "message": "Search query is required",
                "data": None,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }), 400
        
        results = [
            p for p in PRODUCTS_DATA 
            if (query in p['name'].lower() or query in p['partNumber'].lower()) 
            and not p.get('archived')
        ]
        
        response = {
            "success": True,
            "message": f"Search completed, found {len(results)} product(s)",
            "data": {
                "products": results,
                "query": query,
                "count": len(results)
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error searching products: {str(e)}",
            "data": None,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500


# Get all unique categories
@products_bp.route('/categories', methods=['GET'])
def get_all_categories():
    """
    Fetch all unique product categories
    Returns: JSON with list of categories
    """
    try:
        categories = list(set(p['category'] for p in PRODUCTS_DATA if not p.get('archived')))
        categories.sort()
        
        response = {
            "success": True,
            "message": "Categories retrieved successfully",
            "data": {
                "categories": categories,
                "count": len(categories)
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching categories: {str(e)}",
            "data": None,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500