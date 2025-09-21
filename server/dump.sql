--
-- PostgreSQL database dump
--

\restrict 3dBEbVKR1BHQ5zZdGhq6Lgc8PzBMBaroySgzC50yNCg8fKcyBlE7BxFveCbFoEA

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: file_blobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_blobs (
    id integer NOT NULL,
    hash text NOT NULL,
    s3_key text NOT NULL,
    size bigint NOT NULL,
    mime_type text,
    created_at timestamp without time zone DEFAULT now(),
    ref_count integer DEFAULT 1
);


--
-- Name: file_blobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.file_blobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: file_blobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.file_blobs_id_seq OWNED BY public.file_blobs.id;


--
-- Name: system_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_stats (
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    total_users integer DEFAULT 0,
    total_files integer DEFAULT 0,
    total_storage bigint DEFAULT 0,
    total_uploads integer DEFAULT 0,
    total_downloads integer DEFAULT 0,
    deduplication_savings bigint DEFAULT 0
);


--
-- Name: user_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_files (
    id integer NOT NULL,
    user_id integer,
    blob_id integer,
    filename text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now(),
    is_public boolean DEFAULT false
);


--
-- Name: user_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_files_id_seq OWNED BY public.user_files.id;


--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stats (
    user_id integer,
    files_count integer DEFAULT 0,
    storage_used bigint DEFAULT 0,
    uploads_this_month integer DEFAULT 0,
    downloads_this_month integer DEFAULT 0,
    deduplication_savings bigint DEFAULT 0,
    last_active timestamp without time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    last_active timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: file_blobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_blobs ALTER COLUMN id SET DEFAULT nextval('public.file_blobs_id_seq'::regclass);


--
-- Name: user_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_files ALTER COLUMN id SET DEFAULT nextval('public.user_files_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: file_blobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_blobs (id, hash, s3_key, size, mime_type, created_at, ref_count) FROM stdin;
2	978641942267a763065671ede8d2d169f9da3dad588929cfec071f2c69d85e51	blobs/978641942267a763065671ede8d2d169f9da3dad588929cfec071f2c69d85e51-95c4981a-9a43-44a8-8d57-7e1cb5a47a0d	93754	image/png	2025-09-21 02:54:24.729131	1
4	8bc8dab72cb5627c01169e0958cc8fe6f6074a75fcca2d947d798a0e3f12d218	blobs/8bc8dab72cb5627c01169e0958cc8fe6f6074a75fcca2d947d798a0e3f12d218-37570de0-dac8-47a7-ad2d-58c7398148ef	34217	application/pdf	2025-09-21 02:55:03.932189	3
3	f6272dcf9003a2f6db18f87a27ea650ff7933e8c1a68d249d1c13a1330763dd9	blobs/f6272dcf9003a2f6db18f87a27ea650ff7933e8c1a68d249d1c13a1330763dd9-be126179-b03f-4171-82b8-818b51c5beb9	31325	application/pdf	2025-09-21 02:54:55.254211	2
\.


--
-- Data for Name: system_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_stats (snapshot_date, total_users, total_files, total_storage, total_uploads, total_downloads, deduplication_savings) FROM stdin;
2025-09-21	2	1	93754	9	0	165301
\.


--
-- Data for Name: user_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_files (id, user_id, blob_id, filename, uploaded_at, is_public) FROM stdin;
2	1	2	aws-certified-solutions-architect-associate.png	2025-09-21 02:54:24.730914	f
7	2	4	AWS Certified Solutions Architect - Associate certificate.pdf	2025-09-21 02:57:00.004527	f
8	2	4	AWS Certified Solutions Architect - Associate certificate.pdf	2025-09-21 03:00:44.264099	f
9	2	3	AWS Certified Solutions Architect - Associate.pdf	2025-09-21 03:00:53.687247	f
\.


--
-- Data for Name: user_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_stats (user_id, files_count, storage_used, uploads_this_month, downloads_this_month, deduplication_savings, last_active) FROM stdin;
1	1	93754	6	0	65542	2025-09-21 03:00:39.58569
2	0	0	2	0	65542	2025-09-21 03:00:53.687996
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, last_active) FROM stdin;
1	gamingpandey2004@gmail.com	\N
2	mpandey2004@gmail.com	\N
\.


--
-- Name: file_blobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_blobs_id_seq', 4, true);


--
-- Name: user_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_files_id_seq', 9, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: file_blobs file_blobs_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_blobs
    ADD CONSTRAINT file_blobs_hash_key UNIQUE (hash);


--
-- Name: file_blobs file_blobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_blobs
    ADD CONSTRAINT file_blobs_pkey PRIMARY KEY (id);


--
-- Name: file_blobs file_blobs_s3_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_blobs
    ADD CONSTRAINT file_blobs_s3_key_key UNIQUE (s3_key);


--
-- Name: system_stats system_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_stats
    ADD CONSTRAINT system_stats_pkey PRIMARY KEY (snapshot_date);


--
-- Name: user_files user_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT user_files_pkey PRIMARY KEY (id);


--
-- Name: user_stats user_stats_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: user_files user_files_blob_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT user_files_blob_id_fkey FOREIGN KEY (blob_id) REFERENCES public.file_blobs(id) ON DELETE CASCADE;


--
-- Name: user_files user_files_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT user_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_stats user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 3dBEbVKR1BHQ5zZdGhq6Lgc8PzBMBaroySgzC50yNCg8fKcyBlE7BxFveCbFoEA

