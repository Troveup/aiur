
drop table if exists cloud_reference;
drop table if exists charm_instance;
drop table if exists item_instance;

create table cloud_reference (
    id integer primary key autoincrement,
    bucket text not null,
    refType text not null,
    key text not null,
    version integer not null,
    hash text not null,
    content text not null -- the serialized json, temporary until uploading to the bucket is worked out (or performed through existing troveweb app in prod)
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

insert into cloud_reference (bucket, refType, key, version, hash, content)
values ('troveup-dev-private', 'charm', 'dev-debug-link', 1, 'b55cb6e905173e01d628cf102155db817789751460fe1a39886802e8', '{
    "type": "charm",
    "key": "dev-debug-link",
    "version": 1,
    "imgURL": "https://storage.googleapis.com/troveup-dev-private/mto-images/directed-charm-link.png",
    "width": 1.866666666666667,
    "height": 5.833333333333333,
    "anchors": [0, 2.3, 0, -2.3]
}');

insert into cloud_reference (bucket, refType, key, version, hash, content)
values ('troveup-dev-private', 'charm', 'dev-simple-link', 2, '5854463C046A4AAE1995876B6551534D', '{
    "type": "charm",
    "key": "dev-simple-link",
    "version": 2,
    "imgURL": "https://storage.googleapis.com/troveup-dev-private/mto-images/charm-link.png",
    "width": 1.866666666666667,
    "height": 5.833333333333333,
    "anchors": [0, 2.3, 0, -2.3]
}');

insert into cloud_reference (bucket, refType, key, version, hash, content)
values ('troveup-dev-private', 'chain', 'dev-single-anchor', 2, '3cc3a565f31d6d696591807a92c4d863b791a6bece344f4de4f980ff', '{
    "key": "dev-single-anchor",
    "imgURL": "https://storage.googleapis.com/troveup-dev-private/mto-images/demo-chain.png",
    "type": "chain",
    "version": 2,
    "width": 60
    "height": 80,
    "anchors": [ 0.75, -15.5 ]
}');
