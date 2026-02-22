-- PostgreSQL DDL
-- Purpose: local JSON workspace data -> backend CRUD tables

create table if not exists erd_folders (
  id uuid primary key,
  name varchar(120) not null,
  parent_folder_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_erd_folders_parent_folder_id
    foreign key (parent_folder_id) references erd_folders(id) on delete set null,
  constraint ck_erd_folders_not_self_parent
    check (parent_folder_id is null or parent_folder_id <> id)
);

create index if not exists idx_erd_folders_parent_folder_id
  on erd_folders(parent_folder_id);

create table if not exists erd_projects (
  id uuid primary key,
  folder_id uuid null,
  title varchar(200) not null,
  erd_content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 0,
  constraint fk_erd_projects_folder_id
    foreign key (folder_id) references erd_folders(id) on delete set null
);

create index if not exists idx_erd_projects_folder_id
  on erd_projects(folder_id);

create index if not exists idx_erd_projects_updated_at
  on erd_projects(updated_at desc);

create table if not exists api_doc_folders (
  id uuid primary key,
  name varchar(120) not null,
  parent_folder_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_api_doc_folders_parent_folder_id
    foreign key (parent_folder_id) references api_doc_folders(id) on delete set null,
  constraint ck_api_doc_folders_not_self_parent
    check (parent_folder_id is null or parent_folder_id <> id)
);

create index if not exists idx_api_doc_folders_parent_folder_id
  on api_doc_folders(parent_folder_id);

create table if not exists api_doc_pages (
  id uuid primary key,
  folder_id uuid null,
  title varchar(200) not null,
  base_url varchar(500) not null,
  status varchar(20) not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 0,
  constraint fk_api_doc_pages_folder_id
    foreign key (folder_id) references api_doc_folders(id) on delete set null,
  constraint ck_api_doc_pages_status
    check (status in ('draft', 'review', 'approved', 'deprecated'))
);

create index if not exists idx_api_doc_pages_folder_id
  on api_doc_pages(folder_id);

create index if not exists idx_api_doc_pages_updated_at
  on api_doc_pages(updated_at desc);

create table if not exists api_doc_endpoints (
  id uuid primary key,
  page_id uuid not null,
  name varchar(200) not null,
  method varchar(10) not null,
  url_path varchar(500) not null,
  auth varchar(20) not null,
  body_json text not null default '{\n  \n}',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 0,
  constraint fk_api_doc_endpoints_page_id
    foreign key (page_id) references api_doc_pages(id) on delete cascade,
  constraint ck_api_doc_endpoints_method
    check (method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
  constraint ck_api_doc_endpoints_auth
    check (auth in ('none', 'bearer', 'apiKey', 'basic'))
);

create index if not exists idx_api_doc_endpoints_page_id_sort_order
  on api_doc_endpoints(page_id, sort_order asc, updated_at desc);

create index if not exists idx_api_doc_endpoints_method_url_path
  on api_doc_endpoints(method, url_path);

create table if not exists api_doc_endpoint_headers (
  id uuid primary key,
  endpoint_id uuid not null,
  sort_order integer not null default 0,
  header_key varchar(200) not null default '',
  header_value text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_api_doc_endpoint_headers_endpoint_id
    foreign key (endpoint_id) references api_doc_endpoints(id) on delete cascade
);

create index if not exists idx_api_doc_endpoint_headers_endpoint_id_sort_order
  on api_doc_endpoint_headers(endpoint_id, sort_order asc);

create table if not exists api_doc_endpoint_params (
  id uuid primary key,
  endpoint_id uuid not null,
  sort_order integer not null default 0,
  param_key varchar(200) not null default '',
  param_value text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_api_doc_endpoint_params_endpoint_id
    foreign key (endpoint_id) references api_doc_endpoints(id) on delete cascade
);

create index if not exists idx_api_doc_endpoint_params_endpoint_id_sort_order
  on api_doc_endpoint_params(endpoint_id, sort_order asc);

create table if not exists api_doc_endpoint_responses (
  id uuid primary key,
  endpoint_id uuid not null,
  sort_order integer not null default 0,
  status_code integer not null,
  title varchar(120) not null default '',
  description text not null default '',
  body_json text not null default '{\n  \n}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_api_doc_endpoint_responses_endpoint_id
    foreign key (endpoint_id) references api_doc_endpoints(id) on delete cascade,
  constraint ck_api_doc_endpoint_responses_status_code
    check (status_code between 100 and 599)
);

create index if not exists idx_api_doc_endpoint_responses_endpoint_id_sort_order
  on api_doc_endpoint_responses(endpoint_id, sort_order asc);

create index if not exists idx_api_doc_endpoint_responses_status_code
  on api_doc_endpoint_responses(status_code);
