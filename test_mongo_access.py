from pymongo import MongoClient

# MongoDB URI
uri = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.2"

try:
    # Attempt to connect to MongoDB
    client = MongoClient(uri)
    
    # List the available databases
    databases = client.list_database_names()
    
    if databases:
        print("Successfully connected to MongoDB.")
        print("Available databases:")
        for db_name in databases:
            print(db_name)
    else:
        print("Connected to MongoDB, but there are no databases.")
except Exception as e:
    print("Failed to connect to MongoDB:", e)