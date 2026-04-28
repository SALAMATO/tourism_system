-- auto-generated definition
CREATE TABLE China_cities
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    country VARCHAR(50),
    state VARCHAR(100),
    city VARCHAR(100),
    
    latitude DOUBLE,
    longitude DOUBLE,
    
    is_domestic INTEGER DEFAULT 1
);
