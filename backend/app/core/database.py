import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://avnadmin:PASSWORD@nebo-db-neboproject.e.aivencloud.com:21648/defaultdb"
)

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "ssl": True
    },
    pool_pre_ping=True,
    pool_recycle=280
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()