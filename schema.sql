
drop table if exists cloud_reference;
drop table if exists charm_instance;
drop table if exists item_instance;

create table cloud_reference (
    id integer primary key autoincrement,
    bucket text not null,
    refType text not null,
    key text not null,
    version integer not null,
    hash text not null
);

create table item_instance (
    id integer primary key autoincrement,
    title text not null,
    author text not null,
    cost real
);

create table charm_instance (
    id integer primary key autoincrement,
    item_id integer,
    cloud_id integer,
    attachDepth integer,
    posX real,
    posY real,
    rotation real,
    FOREIGN KEY(item_id) REFERENCES item_instance(id),
    FOREIGN KEY(cloud_id) REFERENCES cloud_reference(id)
);
