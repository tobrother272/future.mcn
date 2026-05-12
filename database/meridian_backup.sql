--
-- PostgreSQL database dump
--

\restrict d3558lcGVDCp1Usd3IZmW3CXdmlfB840seq7TE7WPGic3yIwu51ToSAY1FQAvLR

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

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
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    action text NOT NULL,
    actor text,
    detail text,
    ip text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel (
    id text NOT NULL,
    cms_id text,
    partner_id text,
    topic_id text,
    yt_id text,
    name text NOT NULL,
    country text DEFAULT 'VN'::text,
    status text DEFAULT 'Active'::text,
    monetization text DEFAULT 'Pending'::text,
    health text DEFAULT 'Healthy'::text,
    strikes integer DEFAULT 0,
    subscribers bigint DEFAULT 0,
    monthly_views bigint DEFAULT 0,
    monthly_revenue numeric(14,2) DEFAULT 0,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    submitted_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT channel_health_check CHECK ((health = ANY (ARRAY['Healthy'::text, 'Warning'::text, 'Critical'::text]))),
    CONSTRAINT channel_monetization_check CHECK ((monetization = ANY (ARRAY['Monetized'::text, 'Demonetized'::text, 'Suspended'::text, 'Pending'::text]))),
    CONSTRAINT channel_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Pending'::text, 'Suspended'::text, 'Terminated'::text])))
);


--
-- Name: cms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms (
    id text NOT NULL,
    name text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cms_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'VND'::text, 'CAD'::text, 'EUR'::text, 'GBP'::text, 'JPY'::text, 'SGD'::text, 'AUD'::text]))),
    CONSTRAINT cms_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Suspended'::text, 'Closed'::text])))
);


--
-- Name: cms_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_daily (
    cms_id text NOT NULL,
    cms_name text,
    snapshot_date date NOT NULL,
    currency text DEFAULT 'USD'::text,
    revenue numeric(14,2) DEFAULT 0,
    views bigint DEFAULT 0,
    channels integer DEFAULT 0,
    active_channels integer DEFAULT 0,
    monetized integer DEFAULT 0,
    demonetized integer DEFAULT 0,
    suspended integer DEFAULT 0,
    subscribers bigint DEFAULT 0,
    violations integer DEFAULT 0,
    health_score integer DEFAULT 100,
    topics integer DEFAULT 0,
    partners integer DEFAULT 0,
    source text DEFAULT 'auto'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    parent_id text,
    author_id text NOT NULL,
    author_email text,
    author_name text,
    body text NOT NULL,
    mentions text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: contract; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract (
    id text NOT NULL,
    partner_id text NOT NULL,
    contract_name text NOT NULL,
    type text,
    start_date date NOT NULL,
    end_date date,
    signed_date date,
    status text DEFAULT 'Active'::text,
    rev_share numeric(5,2),
    payment_terms text DEFAULT 'Net 30'::text,
    monthly_minimum numeric(14,2) DEFAULT 0,
    terms text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contract_check CHECK (((end_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT contract_status_check CHECK ((status = ANY (ARRAY['Draft'::text, 'Active'::text, 'Expired'::text, 'Terminated'::text]))),
    CONSTRAINT contract_type_check CHECK ((type = ANY (ARRAY['OWNED'::text, 'PRODUCTION'::text, 'AFFILIATE'::text])))
);


--
-- Name: contract_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_channel (
    contract_id text NOT NULL,
    channel_id text NOT NULL,
    assigned_at date DEFAULT CURRENT_DATE NOT NULL,
    ended_at date
);


--
-- Name: decision_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.decision_log (
    id text NOT NULL,
    decision_type text,
    title text NOT NULL,
    context text,
    decision text,
    rationale text,
    outcome text,
    decided_by text,
    decided_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee (
    id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    username text,
    password_hash text,
    role text,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT employee_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text])))
);


--
-- Name: import_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_history (
    id integer NOT NULL,
    file_name text,
    file_hash text,
    file_type text,
    row_count integer DEFAULT 0,
    imported_by text,
    imported_at timestamp with time zone DEFAULT now()
);


--
-- Name: import_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_history_id_seq OWNED BY public.import_history.id;


--
-- Name: mv_dashboard_summary; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_dashboard_summary AS
 SELECT c.cms_id,
    cm.name AS cms_name,
    cm.currency,
    count(c.id) AS total_channels,
    count(c.id) FILTER (WHERE (c.status = 'Active'::text)) AS active_channels,
    count(c.id) FILTER (WHERE (c.monetization = 'Demonetized'::text)) AS demonetized,
    count(c.id) FILTER (WHERE (c.monetization = 'Monetized'::text)) AS monetized,
    count(c.id) FILTER (WHERE (c.health = 'Critical'::text)) AS critical_channels,
    COALESCE(sum(c.monthly_revenue), (0)::numeric) AS total_monthly_revenue,
    COALESCE(sum(c.subscribers), (0)::numeric) AS total_subscribers,
    COALESCE(sum(c.monthly_views), (0)::numeric) AS total_monthly_views,
    count(DISTINCT c.partner_id) FILTER (WHERE (c.partner_id IS NOT NULL)) AS partner_count,
    now() AS refreshed_at
   FROM (public.channel c
     JOIN public.cms cm ON ((c.cms_id = cm.id)))
  GROUP BY c.cms_id, cm.name, cm.currency
  WITH NO DATA;


--
-- Name: partner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner (
    id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    type text DEFAULT 'AFFILIATE'::text NOT NULL,
    tier text DEFAULT 'Standard'::text NOT NULL,
    rev_share numeric(5,2) DEFAULT 70.00,
    dept text,
    status text DEFAULT 'Active'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_name text,
    contact_name text,
    website text,
    parent_id text,
    CONSTRAINT partner_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Suspended'::text, 'Terminated'::text]))),
    CONSTRAINT partner_tier_check CHECK ((tier = ANY (ARRAY['Premium'::text, 'Standard'::text, 'Basic'::text]))),
    CONSTRAINT partner_type_check CHECK ((type = ANY (ARRAY['OWNED'::text, 'PRODUCTION'::text, 'AFFILIATE'::text])))
);


--
-- Name: mv_partner_summary; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_partner_summary AS
 SELECT p.id AS partner_id,
    p.name AS partner_name,
    p.type,
    p.tier,
    p.status,
    count(c.id) AS total_channels,
    count(c.id) FILTER (WHERE (c.status = 'Active'::text)) AS active_channels,
    count(c.id) FILTER (WHERE (c.monetization = 'Monetized'::text)) AS monetized_channels,
    COALESCE(sum(c.monthly_revenue), (0)::numeric) AS total_revenue,
    COALESCE(sum(c.subscribers), (0)::numeric) AS total_subscribers,
    now() AS refreshed_at
   FROM (public.partner p
     LEFT JOIN public.channel c ON ((c.partner_id = p.id)))
  GROUP BY p.id, p.name, p.type, p.tier, p.status
  WITH NO DATA;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification (
    id text NOT NULL,
    user_id text NOT NULL,
    user_type text,
    title text NOT NULL,
    body text,
    link text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_user_type_check CHECK ((user_type = ANY (ARRAY['internal'::text, 'partner'::text])))
);


--
-- Name: partner_alert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_alert (
    id text NOT NULL,
    partner_id text,
    partner_user_id text,
    channel_id text,
    title text NOT NULL,
    body text,
    required_action text,
    status text DEFAULT 'sent'::text,
    sent_by text,
    sent_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    CONSTRAINT partner_alert_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'read'::text, 'resolved'::text])))
);


--
-- Name: partner_contract; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_contract (
    id text NOT NULL,
    partner_id text NOT NULL,
    contract_number text,
    title text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer DEFAULT 0,
    upload_date date DEFAULT CURRENT_DATE NOT NULL,
    employee_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: partner_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_user (
    id text NOT NULL,
    partner_id text,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text,
    password_hash text NOT NULL,
    status text DEFAULT 'PendingApproval'::text,
    approved_by text,
    approved_at timestamp with time zone,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT partner_user_status_check CHECK ((status = ANY (ARRAY['PendingApproval'::text, 'Active'::text, 'Rejected'::text, 'Suspended'::text])))
);


--
-- Name: policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy (
    id text NOT NULL,
    name text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    application text DEFAULT ''::text NOT NULL,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: policy_update; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_update (
    id text NOT NULL,
    title text NOT NULL,
    body text,
    audience text DEFAULT 'all'::text,
    audience_partner_ids text[],
    published_by text,
    published_at timestamp with time zone DEFAULT now(),
    CONSTRAINT policy_update_audience_check CHECK ((audience = ANY (ARRAY['all'::text, 'specific_partners'::text, 'internal_only'::text])))
);


--
-- Name: revenue_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_daily (
    id bigint NOT NULL,
    scope text NOT NULL,
    scope_id text NOT NULL,
    snapshot_date date NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    revenue numeric(14,2) DEFAULT 0,
    views bigint DEFAULT 0,
    subscribers bigint DEFAULT 0,
    channels_count integer DEFAULT 0,
    active_channels integer DEFAULT 0,
    source text DEFAULT 'auto'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT revenue_daily_scope_check CHECK ((scope = ANY (ARRAY['cms'::text, 'channel'::text, 'partner'::text, 'contract'::text]))),
    CONSTRAINT revenue_daily_source_check CHECK ((source = ANY (ARRAY['auto'::text, 'manual'::text, 'import'::text, 'adsense'::text, 'youtube_api'::text, 'csv_import'::text])))
);


--
-- Name: revenue_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.revenue_daily_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: revenue_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.revenue_daily_id_seq OWNED BY public.revenue_daily.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    user_id text NOT NULL,
    user_type text,
    ip text,
    user_agent text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT session_user_type_check CHECK ((user_type = ANY (ARRAY['internal'::text, 'partner'::text])))
);


--
-- Name: setting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.setting (
    key text NOT NULL,
    value jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: submission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submission (
    id text NOT NULL,
    channel_id text,
    partner_user_id text,
    workflow_state text DEFAULT 'SUBMITTED'::text NOT NULL,
    video_title text NOT NULL,
    video_url text,
    storage_type text,
    storage_url text,
    description text,
    category text,
    product_info text,
    license text,
    qc_inspection jsonb,
    admin_note text,
    submitted_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT submission_workflow_state_check CHECK ((workflow_state = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'QC_REVIEWING'::text, 'QC_REJECTED'::text, 'QC_APPROVED'::text, 'CHANNEL_PROVISIONING'::text, 'PROVISIONING_FAILED'::text, 'ACTIVE'::text])))
);


--
-- Name: submission_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submission_log (
    id bigint NOT NULL,
    submission_id text,
    from_state text,
    to_state text NOT NULL,
    by_user_id text,
    by_email text,
    by_role text,
    note text,
    ts timestamp with time zone DEFAULT now()
);


--
-- Name: submission_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.submission_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: submission_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.submission_log_id_seq OWNED BY public.submission_log.id;


--
-- Name: topic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic (
    id text NOT NULL,
    cms_id text,
    name text NOT NULL,
    dept text,
    expected_channels integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    extra_roles text[],
    status text DEFAULT 'Active'::text,
    mfa_enabled boolean DEFAULT false,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_role_check CHECK ((role = ANY (ARRAY['SUPER_ADMIN'::text, 'ADMIN'::text, 'QC_REVIEWER'::text, 'CHANNEL_CREATOR'::text, 'CONTENT_MANAGER'::text, 'FINANCE_MANAGER'::text, 'COMPLIANCE_MANAGER'::text, 'VIEWER'::text]))),
    CONSTRAINT user_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Suspended'::text])))
);


--
-- Name: video; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video (
    id text NOT NULL,
    channel_id text,
    yt_video_id text,
    title text DEFAULT ''::text NOT NULL,
    published_at timestamp with time zone,
    views bigint DEFAULT 0 NOT NULL,
    watch_time_hours numeric(14,2) DEFAULT 0 NOT NULL,
    avg_view_duration text,
    revenue numeric(14,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: violation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.violation (
    id text NOT NULL,
    channel_id text,
    type text DEFAULT 'violation'::text NOT NULL,
    severity text,
    status text DEFAULT 'Active'::text,
    video_title text,
    video_url text,
    detected_date date,
    resolved_date date,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    name text DEFAULT ''::text NOT NULL,
    violation_type text DEFAULT 'Hình ảnh / Video'::text,
    video_id text,
    video_thumb text,
    channel_name text DEFAULT ''::text,
    channel_url text,
    content text DEFAULT ''::text,
    policy_id text,
    resolution text DEFAULT ''::text,
    result text DEFAULT 'Không thực hiện'::text,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    image_captions jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT violation_severity_check CHECK ((severity = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Critical'::text]))),
    CONSTRAINT violation_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Resolved'::text, 'Appealed'::text, 'Dismissed'::text])))
);


--
-- Name: violation_resolution; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.violation_resolution (
    id text NOT NULL,
    violation_id text NOT NULL,
    resolution text NOT NULL,
    handler_info text DEFAULT ''::text,
    resolved_date date,
    result_date date,
    result text DEFAULT 'Chờ Xử Lý'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: import_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_history ALTER COLUMN id SET DEFAULT nextval('public.import_history_id_seq'::regclass);


--
-- Name: revenue_daily id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_daily ALTER COLUMN id SET DEFAULT nextval('public.revenue_daily_id_seq'::regclass);


--
-- Name: submission_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_log ALTER COLUMN id SET DEFAULT nextval('public.submission_log_id_seq'::regclass);


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, action, actor, detail, ip, created_at) FROM stdin;
\.


--
-- Data for Name: channel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.channel (id, cms_id, partner_id, topic_id, yt_id, name, country, status, monetization, health, strikes, subscribers, monthly_views, monthly_revenue, notes, metadata, submitted_by, created_at, updated_at) FROM stdin;
C_MP07D68BRYCB	KUDO	\N	\N	UCF8tzVIpoACyt6z9uQ9Sx0Q	RUMPO TV SPANISH	VN	Active	Monetized	Healthy	0	0	742755	2195.03	\N	{}	\N	2026-05-10 20:05:40.427932+00	2026-05-10 20:05:40.427932+00
C_MP07D68CMQPT	KUDO	\N	\N	UCcn9O-2Kwi9BdguyccxOFXA	RUMPO TV	VN	Active	Monetized	Healthy	0	0	630597	5121.97	\N	{}	\N	2026-05-10 20:05:40.429039+00	2026-05-10 20:05:40.429039+00
C_MP07D68EIW5H	KUDO	\N	\N	UC0h6RSSibJ0LvWCV63G_kkQ	ZAPPO Japanese	VN	Active	Monetized	Healthy	0	0	551261	3353.38	\N	{}	\N	2026-05-10 20:05:40.430163+00	2026-05-10 20:05:40.430163+00
C_MP07D68GLWP0	KUDO	\N	\N	UCYh5Ff62NcXgwJTpxqLt9_Q	RUMPO MAX ESP	VN	Active	Monetized	Healthy	0	0	505928	1568.28	\N	{}	\N	2026-05-10 20:05:40.432419+00	2026-05-10 20:05:40.432419+00
C_MP07D68KYPDA	KUDO	\N	\N	UCXnV_zFPy5JH5NXAcSyY4Qw	TEEZE DRONE ESP	VN	Active	Monetized	Healthy	0	0	356743	1373.96	\N	{}	\N	2026-05-10 20:05:40.436266+00	2026-05-10 20:05:40.436266+00
C_MP07D68LJMOY	KUDO	\N	\N	UCfWhKe9_x2pCmXgX2EB9fYg	TEEZE FRENCH	VN	Active	Monetized	Healthy	0	0	325860	1188.20	\N	{}	\N	2026-05-10 20:05:40.437414+00	2026-05-10 20:05:40.437414+00
C_MP07D68MF4KH	KUDO	\N	\N	UCM3QOJNEWFVGEMEVBI099Zg	ZAPPO Hunter Pro	VN	Active	Monetized	Healthy	0	0	282659	2360.51	\N	{}	\N	2026-05-10 20:05:40.4389+00	2026-05-10 20:05:40.4389+00
C_MP07D68Q2AXT	KUDO	\N	\N	UCWGcPSpyvzIt2R-lpULRPYw	XANDOR ES	VN	Active	Monetized	Healthy	0	0	105139	174.83	\N	{}	\N	2026-05-10 20:05:40.442295+00	2026-05-10 20:05:40.442295+00
C_MP07D68RSRL2	KUDO	\N	\N	UCPs4bq7qbmG3yHHEBBPlIsA	TEEZE CHALLENGE	VN	Active	Monetized	Healthy	0	0	87206	563.77	\N	{}	\N	2026-05-10 20:05:40.443526+00	2026-05-10 20:05:40.443526+00
C_MP07D68SYY8Q	KUDO	\N	\N	UC1pfQ7oG1LiFYd52n1pOmyA	Tina Toys Unboxing	VN	Active	Monetized	Healthy	0	0	80435	224.33	\N	{}	\N	2026-05-10 20:05:40.444908+00	2026-05-10 20:05:40.444908+00
C_MP07D68UA8IA	KUDO	\N	\N	UC1gd4JZV13m8XrTYZ8VmKCg	TEEZE GERMAN	VN	Active	Monetized	Healthy	0	0	71497	391.57	\N	{}	\N	2026-05-10 20:05:40.446164+00	2026-05-10 20:05:40.446164+00
C_MP07D68VPE97	KUDO	\N	\N	UCzACFZJt1vj8XANNwjXWorw	XANDOR	VN	Active	Monetized	Healthy	0	0	60913	282.30	\N	{}	\N	2026-05-10 20:05:40.44726+00	2026-05-10 20:05:40.44726+00
C_MP07D68WA6F9	KUDO	\N	\N	UCEjDe9d9QR2lX1_csO1KbAQ	ZEEZE GOLD	VN	Active	Monetized	Healthy	0	0	56148	202.41	\N	{}	\N	2026-05-10 20:05:40.448422+00	2026-05-10 20:05:40.448422+00
C_MP07D68XGAOV	KUDO	\N	\N	UCl4pxNO6qr1ylGpiaDBPOWw	ZEEZE FRANCE	VN	Active	Monetized	Healthy	0	0	55380	189.45	\N	{}	\N	2026-05-10 20:05:40.449591+00	2026-05-10 20:05:40.449591+00
C_MP07D68YIEWP	KUDO	\N	\N	UCHwoURDEsJTmA9JPDF4AxPA	ZEEZE Español	VN	Active	Monetized	Healthy	0	0	48209	101.07	\N	{}	\N	2026-05-10 20:05:40.450793+00	2026-05-10 20:05:40.450793+00
C_MP07D68ZFMU7	KUDO	\N	\N	UCZ3fsOC_1Fxl2Zb8sSKdI8g	RUMPO TV GERMAN	VN	Active	Monetized	Healthy	0	0	45033	346.76	\N	{}	\N	2026-05-10 20:05:40.451906+00	2026-05-10 20:05:40.451906+00
C_MP07D69084JZ	KUDO	\N	\N	UCVl4K8VFzcDbudyB7NJMehQ	ZINNO Power	VN	Active	Monetized	Healthy	0	0	34891	357.52	\N	{}	\N	2026-05-10 20:05:40.453053+00	2026-05-10 20:05:40.453053+00
C_MP07D693ZX4Z	KUDO	\N	\N	UCZOPWThyKWpHAWR2hQiLzmg	RUMPO GOLD	VN	Active	Monetized	Healthy	0	0	23481	58.44	\N	{}	\N	2026-05-10 20:05:40.455295+00	2026-05-10 20:05:40.455295+00
C_MP07D694NHNA	KUDO	\N	\N	UCRqtDnsZ5oTQeSPACWauwLQ	MORIX	VN	Active	Pending	Healthy	0	0	21636	0.00	\N	{}	\N	2026-05-10 20:05:40.456363+00	2026-05-10 20:05:40.456363+00
C_MP07D695R9SE	KUDO	\N	\N	UCuCVkEZHv6h9WimPhlRBPLQ	TEEZE BIG GOLD	VN	Active	Monetized	Healthy	0	0	381	0.33	\N	{}	\N	2026-05-10 20:05:40.45743+00	2026-05-10 20:05:40.45743+00
C_MP07D696VUPZ	KUDO	\N	\N	UCtZ5iOLdhMRz6b-aIVn8BVQ	PlAze TV	VN	Active	Monetized	Healthy	0	0	283	0.04	\N	{}	\N	2026-05-10 20:05:40.458527+00	2026-05-10 20:05:40.458527+00
C_MP07D6978XSF	KUDO	\N	\N	UCK4U2uXYwuq0TL8k81rU_iA	SIMON RANCID 98	VN	Active	Pending	Healthy	0	0	16	0.00	\N	{}	\N	2026-05-10 20:05:40.459677+00	2026-05-10 20:05:40.459677+00
C_MP07D69B9V3Z	KUDO	\N	\N	UCKakJWDkVSL7aDb1oVgQj2A	iPodtouch2554	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 20:05:40.463161+00	2026-05-10 20:05:40.463161+00
C_MP07D69CQY7W	KUDO	\N	\N	UCYRNogiCH4VeFCdq-xnEoig	TheMrCrafter	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 20:05:40.464246+00	2026-05-10 20:05:40.464246+00
C_MP07D68HWVNI	KUDO	P_MP07VUS1ZI1A	\N	UCe66A8mWuiGr5lUjMCONbCg	KPOP Cubes DIY	VN	Active	Monetized	Healthy	0	0	437909	1483.62	\N	{}	\N	2026-05-10 20:05:40.433575+00	2026-05-10 21:31:45.27343+00
C_MP07D6884HPY	KUDO	\N	\N	UCDl6joCWB_dJl3qAxoIEUQQ	ZAPPO Hunter ESP	VN	Active	Pending	Healthy	0	0	27062	0.00	\N	{}	\N	2026-05-10 20:05:40.424366+00	2026-05-10 20:05:48.730642+00
C_MP07D6864ZZR	KUDO	P_MP081JGTCOM4	\N	UCt0-eO7homMj2mRBtB7Gehw	BooTiKaTi Show ESP	VN	Active	Pending	Healthy	0	0	19522	0.00	\N	{}	\N	2026-05-10 20:05:40.423068+00	2026-05-10 20:35:56.952666+00
C_MP07D68IAJV7	KUDO	P_MP081JGTCOM4	\N	UClfXstJ5zAN5R7ZhER8idbg	Bootikati Español	VN	Active	Monetized	Healthy	0	0	361880	342.17	\N	{}	\N	2026-05-10 20:05:40.43504+00	2026-05-10 20:36:01.641252+00
C_MP07D68PMT3O	KUDO	P_MP07VUS1ZI1A	\N	UCh-djxSS39I4TacvY_DjBxw	Tiny Toys Unboxing	VN	Active	Monetized	Healthy	0	0	125685	495.57	\N	{}	\N	2026-05-10 20:05:40.441145+00	2026-05-10 20:36:24.795617+00
C_MP07D685S9CB	KUDO	P_MP081JGTCOM4	\N	UCO_wZj8ShKcQU_iKWGv1yYQ	BisKids World	VN	Active	Pending	Healthy	0	0	46164	0.00	\N	{}	\N	2026-05-10 20:05:40.421792+00	2026-05-10 20:35:46.264783+00
C_MP07D68FB7FT	KUDO	P_MP081JGTCOM4	\N	UCI-9QbdlXZPwRnSxWRcsoiA	Chaka Lala	VN	Active	Monetized	Healthy	0	0	511291	661.39	\N	{}	\N	2026-05-10 20:05:40.431318+00	2026-05-10 20:36:05.737499+00
C_MP07D698R9LD	KUDO	P_MP07VUS1ZI1A	\N	UCxaZ0oJZJlRQ8wQihzwzsWg	Tina Unboxing Toys	VN	Active	Pending	Healthy	0	0	9	0.00	\N	{}	\N	2026-05-10 20:05:40.46086+00	2026-05-10 20:36:30.416656+00
C_MP07D67VBWZS	KUDO	P_MP0867GFGAZ8	\N	UClPmQ59Dyz_e8go3E58ISHw	Tana Toys ASMR	VN	Active	Pending	Healthy	0	0	59694	0.00	\N	{}	\N	2026-05-10 20:05:40.411964+00	2026-05-10 20:36:52.222339+00
C_MP07D68A6Z5H	KUDO	P_MP07W73D3FTT	\N	UCauhX_PVCgq6dJZAMx_BlQg	TEEZE ESP	VN	Active	Monetized	Healthy	0	0	799522	3515.30	\N	{}	\N	2026-05-10 20:05:40.426806+00	2026-05-10 21:26:33.845091+00
C_MP07D69DYNBV	KUDO	P_MP07W73D3FTT	\N	UCKVYOBkMsggLdSg-RZLwXRg	TheGeeksOf53	VN	Active	Pending	Healthy	0	0	0	0.00	\N	{}	\N	2026-05-10 20:05:40.465422+00	2026-05-10 21:26:36.822968+00
C_MP07D68NFUBV	KUDO	P_MP07W73D3FTT	T_MP0ACLNLUF35	UC8SGxSPEwDWMvegn_smKDSw	TEEZE CHALLENGE ESP	VN	Active	Monetized	Healthy	0	0	141899	273.07	\N	{}	\N	2026-05-10 20:05:40.44004+00	2026-05-10 21:29:13.640695+00
C_MP07D692JP6I	KUDO	\N	\N	UCDQ_TQA8PUGVF4F0wfCqwpA	Kaiz Minecraft	VN	Active	Monetized	Healthy	0	0	26724	21.06	\N	{}	\N	2026-05-10 20:05:40.454208+00	2026-05-10 22:43:23.539391+00
C_MP07D6896RCN	KUDO	\N	\N	UC0i4Jrfv2iKDsa8b9USKscQ	Lina Toys Unboxing	VN	Active	Pending	Healthy	0	0	72639	0.00	\N	{}	\N	2026-05-10 20:05:40.425605+00	2026-05-10 22:43:23.539391+00
C_MP0DP7CUHPQE	KUDO_FUTURE	\N	\N	UCzpsYrRIXO-XHwJbmHkYt0w	AM Bricks Challenges	VN	Active	Monetized	Healthy	0	0	11328194	468.91	\N	{}	\N	2026-05-10 23:02:59.45482+00	2026-05-10 23:02:59.45482+00
C_MP0DP7D0U8D1	KUDO_FUTURE	\N	\N	UCctEGDKX6iYfX48p27pApMA	BaBaBop Tiếng Việt	VN	Active	Monetized	Healthy	0	0	10793797	9370.50	\N	{}	\N	2026-05-10 23:02:59.46039+00	2026-05-10 23:02:59.46039+00
C_MP0DP7D1EIRG	KUDO_FUTURE	\N	\N	UC85QuGIoN9pHBcKqLJetgmA	ChaChaBoom ESP	VN	Active	Monetized	Healthy	0	0	9185556	48589.85	\N	{}	\N	2026-05-10 23:02:59.461503+00	2026-05-10 23:02:59.461503+00
C_MP0DP7D2CE3Y	KUDO_FUTURE	\N	\N	UCsNaP8L5DhmmgQsIU4BUo-g	PiPiPop FR	VN	Active	Monetized	Healthy	0	0	9039074	7614.79	\N	{}	\N	2026-05-10 23:02:59.462564+00	2026-05-10 23:02:59.462564+00
C_MP0DP7D3NH2O	KUDO_FUTURE	\N	\N	UCOLFP95AVX4122nIA7kIPkQ	FUNZ Bricks	VN	Active	Monetized	Healthy	0	0	7256105	1.28	\N	{}	\N	2026-05-10 23:02:59.463659+00	2026-05-10 23:02:59.463659+00
C_MP0DP7D41I40	KUDO_FUTURE	\N	\N	UCjo9_u6q94FFkSz3BJpgmYg	BaBaBop ESP	VN	Active	Monetized	Healthy	0	0	6810776	17389.83	\N	{}	\N	2026-05-10 23:02:59.464706+00	2026-05-10 23:02:59.464706+00
C_MP0DP7D5UBCB	KUDO_FUTURE	\N	\N	UCyLGwTTbltKJ_OMhnyoUSqQ	BEAR Bricks	VN	Active	Monetized	Healthy	0	0	5732556	13907.32	\N	{}	\N	2026-05-10 23:02:59.465879+00	2026-05-10 23:02:59.465879+00
C_MP0DP7D62AQ1	KUDO_FUTURE	\N	\N	UCKrNjEze-UAtGnSNQMLRMow	BaBaBop Turkish	VN	Active	Monetized	Healthy	0	0	5540688	10592.88	\N	{}	\N	2026-05-10 23:02:59.466899+00	2026-05-10 23:02:59.466899+00
C_MP0DP7D7M37E	KUDO_FUTURE	\N	\N	UCkQnXmnrgxQHTLVd1vPdd4A	BaBaBop Arabic	VN	Active	Monetized	Healthy	0	0	4853509	3225.72	\N	{}	\N	2026-05-10 23:02:59.467946+00	2026-05-10 23:02:59.467946+00
C_MP0DP7D8YQLF	KUDO_FUTURE	\N	\N	UCKoydmtGdlarYDYuvqw0VwQ	BaBaBop	VN	Active	Monetized	Healthy	0	0	4803247	22032.18	\N	{}	\N	2026-05-10 23:02:59.469059+00	2026-05-10 23:02:59.469059+00
C_MP0DP7DATNQ1	KUDO_FUTURE	\N	\N	UCPZOahSq-156N6phr9jkQBg	PiPiPop ESP	VN	Active	Monetized	Healthy	0	0	4696822	6051.32	\N	{}	\N	2026-05-10 23:02:59.470122+00	2026-05-10 23:02:59.470122+00
C_MP0DP7DBG7PV	KUDO_FUTURE	\N	\N	UCqZt8RijJyU7l6WGSGSvwSQ	BaBaBop Fr	VN	Active	Monetized	Healthy	0	0	4165528	15831.51	\N	{}	\N	2026-05-10 23:02:59.471133+00	2026-05-10 23:02:59.471133+00
C_MP0DP7DCIH4D	KUDO_FUTURE	\N	\N	UC_z9Hte3Ll-siFlAhx9k1eg	BaBaBop Español	VN	Active	Monetized	Healthy	0	0	3878308	7507.49	\N	{}	\N	2026-05-10 23:02:59.472164+00	2026-05-10 23:02:59.472164+00
C_MP0DP7DDO6FR	KUDO_FUTURE	\N	\N	UCeKxWbAvz3kEAiKkm4pcalA	BaBaBop JP	VN	Active	Monetized	Healthy	0	0	3864602	17229.85	\N	{}	\N	2026-05-10 23:02:59.473259+00	2026-05-10 23:02:59.473259+00
C_MP0DP7DETSPI	KUDO_FUTURE	\N	\N	UCdEQV9ulINJ_3LMYa4vmnxw	RB Bricks JP	VN	Active	Monetized	Healthy	0	0	3560116	4188.40	\N	{}	\N	2026-05-10 23:02:59.474357+00	2026-05-10 23:02:59.474357+00
C_MP0DP7DFDZJ0	KUDO_FUTURE	\N	\N	UCoKE9CXLFad8w1MEnkITtLw	BomBomBop ESP	VN	Active	Monetized	Healthy	0	0	3513891	8027.60	\N	{}	\N	2026-05-10 23:02:59.475674+00	2026-05-10 23:02:59.475674+00
C_MP0DP7DHQBX3	KUDO_FUTURE	\N	\N	UCPlbT-PDp_4L-w1mmCjiMQw	BaBaBop PT	VN	Active	Monetized	Healthy	0	0	3426212	9942.01	\N	{}	\N	2026-05-10 23:02:59.477129+00	2026-05-10 23:02:59.477129+00
C_MP0DP7DI9Y4I	KUDO_FUTURE	\N	\N	UCa3KQ452ZPHnxbZrK_59ldA	BEAR Bricks Korea	VN	Active	Monetized	Healthy	0	0	3387133	6218.00	\N	{}	\N	2026-05-10 23:02:59.478407+00	2026-05-10 23:02:59.478407+00
C_MP0DP7DJDQOL	KUDO_FUTURE	\N	\N	UCjxcKbrKkWoDGVf7-ZBCKcg	Smart Lego	VN	Active	Monetized	Healthy	0	0	3234333	11881.79	\N	{}	\N	2026-05-10 23:02:59.479516+00	2026-05-10 23:02:59.479516+00
C_MP0DP7DK9QFG	KUDO_FUTURE	\N	\N	UCLPEGx-YagRfXWaHyvSQcow	BaBaBop Polish	VN	Active	Monetized	Healthy	0	0	3175250	19602.76	\N	{}	\N	2026-05-10 23:02:59.480547+00	2026-05-10 23:02:59.480547+00
C_MP0DP7DLODX9	KUDO_FUTURE	\N	\N	UCHxrUYAJ50TQOng7iOX0q2Q	BomBomBop Gold	VN	Active	Monetized	Healthy	0	0	2848857	7806.18	\N	{}	\N	2026-05-10 23:02:59.481563+00	2026-05-10 23:02:59.481563+00
C_MP0DP7DM76W1	KUDO_FUTURE	\N	\N	UClrOX3m3IK3vffjNoU5V2Qg	Hana Teens Japanese	VN	Active	Monetized	Healthy	0	0	2722086	25167.62	\N	{}	\N	2026-05-10 23:02:59.482576+00	2026-05-10 23:02:59.482576+00
C_MP0DP7DNMT22	KUDO_FUTURE	\N	\N	UCExQL0DSoIEfQ4bqxEnBg-A	Hana Teens FR	VN	Active	Monetized	Healthy	0	0	2703629	12883.80	\N	{}	\N	2026-05-10 23:02:59.483642+00	2026-05-10 23:02:59.483642+00
C_MP0DP7DOGQSP	KUDO_FUTURE	\N	\N	UCQpdX6acT_omv7rXVRMTGUg	BBB Indo	VN	Active	Monetized	Healthy	0	0	2533246	865.22	\N	{}	\N	2026-05-10 23:02:59.48469+00	2026-05-10 23:02:59.48469+00
C_MP0DP7DP242E	KUDO_FUTURE	\N	\N	UCqeP-xht1MimAz9CWui8aEQ	BaBaBop Girls	VN	Active	Monetized	Healthy	0	0	2466045	7386.74	\N	{}	\N	2026-05-10 23:02:59.485763+00	2026-05-10 23:02:59.485763+00
C_MP0DP7DQYGGI	KUDO_FUTURE	\N	\N	UCe6il2rLkEBb-joC3YCws3w	RB Bricks Portuguese	VN	Active	Monetized	Healthy	0	0	2447919	1900.10	\N	{}	\N	2026-05-10 23:02:59.486799+00	2026-05-10 23:02:59.486799+00
C_MP0DP7DROCGR	KUDO_FUTURE	\N	\N	UCx_dfw4dn9WdsYnGvTDdg4Q	Hana Teens	VN	Active	Monetized	Healthy	0	0	2405828	8038.04	\N	{}	\N	2026-05-10 23:02:59.487826+00	2026-05-10 23:02:59.487826+00
C_MP0DP7DS4C03	KUDO_FUTURE	\N	\N	UC6K4I1lGyAJ_1kuRBbE2EcQ	RIAM Bricks	VN	Active	Monetized	Healthy	0	0	2384309	3433.50	\N	{}	\N	2026-05-10 23:02:59.488895+00	2026-05-10 23:02:59.488895+00
C_MP0DP7DT7M3R	KUDO_FUTURE	\N	\N	UChoIBiLdpXqqamkUF_9QEcQ	BOBAPIC PT	VN	Active	Monetized	Healthy	0	0	2351169	2075.07	\N	{}	\N	2026-05-10 23:02:59.489912+00	2026-05-10 23:02:59.489912+00
C_MP0DP7DV7OS7	KUDO_FUTURE	\N	\N	UCoZ4dRY2sLkNCaHfDnmDKMw	FM Lego Technic	VN	Active	Monetized	Healthy	0	0	2314331	5577.04	\N	{}	\N	2026-05-10 23:02:59.491415+00	2026-05-10 23:02:59.491415+00
C_MP0DP7DW1SPJ	KUDO_FUTURE	\N	\N	UCUjo8ALObQFeoIu742UXsGw	BOBAPIC	VN	Active	Monetized	Healthy	0	0	2199237	10920.19	\N	{}	\N	2026-05-10 23:02:59.492461+00	2026-05-10 23:02:59.492461+00
C_MP0DP7DXRGEH	KUDO_FUTURE	\N	\N	UCClD8NoVTQ5fISWKqumySaQ	LiLiLaLa ESP	VN	Active	Monetized	Healthy	0	0	2127447	4445.52	\N	{}	\N	2026-05-10 23:02:59.493554+00	2026-05-10 23:02:59.493554+00
C_MP0DP7DYOAV3	KUDO_FUTURE	\N	\N	UCaBUHgL_7NwfiZ7-B7g4uUg	LiLiLaLa JP	VN	Active	Monetized	Healthy	0	0	2044988	11037.09	\N	{}	\N	2026-05-10 23:02:59.494619+00	2026-05-10 23:02:59.494619+00
C_MP0DP7DZHFEW	KUDO_FUTURE	\N	\N	UCF1pJUFa2SviHc45DGFEqXQ	LiLiLaLa PT	VN	Active	Monetized	Healthy	0	0	1973923	3277.97	\N	{}	\N	2026-05-10 23:02:59.495813+00	2026-05-10 23:02:59.495813+00
C_MP0DP7E0P0SD	KUDO_FUTURE	\N	\N	UC_CaXL_2XSLNg8cknPquQaw	RM Bricks ESP	VN	Active	Monetized	Healthy	0	0	1927031	1280.77	\N	{}	\N	2026-05-10 23:02:59.496917+00	2026-05-10 23:02:59.496917+00
C_MP0DP7E1FYRR	KUDO_FUTURE	\N	\N	UC5RwmRTJG9pvMDe8TyCekuA	BomBomBop PT	VN	Active	Monetized	Healthy	0	0	1881638	314.28	\N	{}	\N	2026-05-10 23:02:59.497964+00	2026-05-10 23:02:59.497964+00
C_MP0DP7E2XQ4Z	KUDO_FUTURE	\N	\N	UCUBMaH3EVQs21YN49hl8Caw	BOBAPIC ESP	VN	Active	Monetized	Healthy	0	0	1720569	2622.11	\N	{}	\N	2026-05-10 23:02:59.498994+00	2026-05-10 23:02:59.498994+00
C_MP0DP7E39CQZ	KUDO_FUTURE	\N	\N	UChCc9ylQwc94qfbl8i_Npcw	ROBO Bricks en Español	VN	Active	Monetized	Healthy	0	0	1671825	820.21	\N	{}	\N	2026-05-10 23:02:59.500034+00	2026-05-10 23:02:59.500034+00
C_MP0DP7E5LHQZ	KUDO_FUTURE	\N	\N	UCt7Sf4chK8e3Ejme6TWuL4A	BaBaBop Korea	VN	Active	Monetized	Healthy	0	0	1640932	4108.02	\N	{}	\N	2026-05-10 23:02:59.501129+00	2026-05-10 23:02:59.501129+00
C_MP0DP7E6UG34	KUDO_FUTURE	\N	\N	UCRC6_ABf95bsNEAMpLa_rIw	BaBaBop De	VN	Active	Monetized	Healthy	0	0	1633243	15873.62	\N	{}	\N	2026-05-10 23:02:59.502168+00	2026-05-10 23:02:59.502168+00
C_MP0DP7E7MGM2	KUDO_FUTURE	\N	\N	UCfHSWbO2x63BqQepScuFyXw	BomBomBop JP	VN	Active	Monetized	Healthy	0	0	1625996	4506.75	\N	{}	\N	2026-05-10 23:02:59.503195+00	2026-05-10 23:02:59.503195+00
C_MP0DP7E8C3SY	KUDO_FUTURE	\N	\N	UC5rrTGlQPkZg-32DNE-Pr6A	PiPiPop	VN	Active	Monetized	Healthy	0	0	1528984	5817.17	\N	{}	\N	2026-05-10 23:02:59.504274+00	2026-05-10 23:02:59.504274+00
C_MP0DP7E97A4E	KUDO_FUTURE	\N	\N	UChesQtOXfW3Ew1oEkqw62Ug	BaBaBop Greek	VN	Active	Monetized	Healthy	0	0	1527924	595.71	\N	{}	\N	2026-05-10 23:02:59.505298+00	2026-05-10 23:02:59.505298+00
C_MP0DP7EAQVO3	KUDO_FUTURE	\N	\N	UCmrgyQ_5eyvYMdHrTtZNZnw	BaBaBop Italian	VN	Active	Monetized	Healthy	0	0	1330610	8623.90	\N	{}	\N	2026-05-10 23:02:59.50637+00	2026-05-10 23:02:59.50637+00
C_MP0DP7EB629A	KUDO_FUTURE	\N	\N	UCbXceRwPxFu-sCzhoh_17fg	ROBO Bricks Channel	VN	Active	Monetized	Healthy	0	0	1223576	1849.10	\N	{}	\N	2026-05-10 23:02:59.507622+00	2026-05-10 23:02:59.507622+00
C_MP0DP7EC4ABQ	KUDO_FUTURE	\N	\N	UC4rTHvZ0QQtkIBCDp8lDozA	PiPiPop JP	VN	Active	Monetized	Healthy	0	0	935112	2557.69	\N	{}	\N	2026-05-10 23:02:59.508714+00	2026-05-10 23:02:59.508714+00
C_MP0DP7ED5VH0	KUDO_FUTURE	\N	\N	UCfz9F-P7LY9CuJHRJAWTTMQ	BaBaBop Netherlands	VN	Active	Monetized	Healthy	0	0	884326	548.76	\N	{}	\N	2026-05-10 23:02:59.509793+00	2026-05-10 23:02:59.509793+00
C_MP0DP7EE6F9R	KUDO_FUTURE	\N	\N	UChgcBc1DJ68HEv2l7uEbYnA	JK Lego Technic	VN	Active	Monetized	Healthy	0	0	856172	85.74	\N	{}	\N	2026-05-10 23:02:59.510808+00	2026-05-10 23:02:59.510808+00
C_MP07D6994TI2	KUDO_FUTURE	\N	\N	UC1O8UR-C1Kkpbtyql9s1emg	RM Bricks Channel	VN	Active	Monetized	Healthy	0	0	835892	1316.03	\N	{}	\N	2026-05-10 20:05:40.462051+00	2026-05-10 23:02:59.511876+00
C_MP0DP7EIS04A	KUDO_FUTURE	\N	\N	UCEApH-0xS9vuF8cAdrx3Xjw	BEAR Bricks France	VN	Active	Monetized	Healthy	0	0	748571	210.37	\N	{}	\N	2026-05-10 23:02:59.514131+00	2026-05-10 23:02:59.514131+00
C_MP0DP7EJSW9X	KUDO_FUTURE	\N	\N	UCujS4JV-N_qfuym8qchTnmA	ROBO Bricks日本	VN	Active	Monetized	Healthy	0	0	732341	356.66	\N	{}	\N	2026-05-10 23:02:59.515243+00	2026-05-10 23:02:59.515243+00
C_MP0DP7EK29L9	KUDO_FUTURE	\N	\N	UCXkup9InCz1WEme6e9kQ3Rw	BaBaBop French	VN	Active	Monetized	Healthy	0	0	713215	816.39	\N	{}	\N	2026-05-10 23:02:59.516354+00	2026-05-10 23:02:59.516354+00
C_MP0DP7ELKK8N	KUDO_FUTURE	\N	\N	UCRZYDrFEVAGOo8ku704OeaA	BaBaBop German	VN	Active	Monetized	Healthy	0	0	673347	4196.33	\N	{}	\N	2026-05-10 23:02:59.517437+00	2026-05-10 23:02:59.517437+00
C_MP0DP7EM30Y1	KUDO_FUTURE	\N	\N	UC6Hm02m2hZxolPXa2uyJygA	HOHOHOU	VN	Active	Monetized	Healthy	0	0	670045	17.72	\N	{}	\N	2026-05-10 23:02:59.518496+00	2026-05-10 23:02:59.518496+00
C_MP0DP7EN771H	KUDO_FUTURE	\N	\N	UCD6OAEftGA8PBn2gBHjlijg	JJ Bricks	VN	Active	Monetized	Healthy	0	0	648004	1517.36	\N	{}	\N	2026-05-10 23:02:59.519714+00	2026-05-10 23:02:59.519714+00
C_MP0DP7EO7846	KUDO_FUTURE	\N	\N	UC5fHwXDqVXxwH8X9Mb09DoA	KPOP RUMIE & GINU	VN	Active	Monetized	Healthy	0	0	582233	2068.00	\N	{}	\N	2026-05-10 23:02:59.520845+00	2026-05-10 23:02:59.520845+00
C_MP0DP7EPNX8X	KUDO_FUTURE	\N	\N	UC12coWkT1fdXPhKiElQ-FQw	RB Bricks Español	VN	Active	Monetized	Healthy	0	0	536796	616.27	\N	{}	\N	2026-05-10 23:02:59.521953+00	2026-05-10 23:02:59.521953+00
C_MP0DP7EQDKOK	KUDO_FUTURE	\N	\N	UCz84u_x85bGomsFYgLHf-JQ	JK Bricks ESP	VN	Active	Monetized	Healthy	0	0	529471	117.46	\N	{}	\N	2026-05-10 23:02:59.523052+00	2026-05-10 23:02:59.523052+00
C_MP0DP7ES8D80	KUDO_FUTURE	\N	\N	UCuRJJnmCCzYoN5jE-Yalnng	BlaBlaBla	VN	Active	Monetized	Healthy	0	0	515852	109.97	\N	{}	\N	2026-05-10 23:02:59.524228+00	2026-05-10 23:02:59.524228+00
C_MP0DP7ET6U7C	KUDO_FUTURE	\N	\N	UCOE3NlCuXLpdzL5VwX1CzOg	LEGO Smart	VN	Active	Monetized	Healthy	0	0	497729	1115.35	\N	{}	\N	2026-05-10 23:02:59.525332+00	2026-05-10 23:02:59.525332+00
C_MP0DP7EUPN1R	KUDO_FUTURE	\N	\N	UCl7jB3Rb-vggmnxnmWLObnQ	PICK Bricks	VN	Active	Monetized	Healthy	0	0	471524	394.97	\N	{}	\N	2026-05-10 23:02:59.526372+00	2026-05-10 23:02:59.526372+00
C_MP0DP7EVA994	KUDO_FUTURE	\N	\N	UCcI-mDR0wc_NMEWjkYqEF0w	AM Bricks JP	VN	Active	Monetized	Healthy	0	0	445239	1495.52	\N	{}	\N	2026-05-10 23:02:59.52746+00	2026-05-10 23:02:59.52746+00
C_MP0DP7EWM842	KUDO_FUTURE	\N	\N	UC46MC_zoXlZ8o0AOi_vq20Q	HaHaHap	VN	Active	Monetized	Healthy	0	0	439658	97.69	\N	{}	\N	2026-05-10 23:02:59.528494+00	2026-05-10 23:02:59.528494+00
C_MP0DP7EX513H	KUDO_FUTURE	\N	\N	UC18FpjE_M0NlPPM_Qx0-woA	Rumie Roblox ESP	VN	Active	Pending	Healthy	0	0	365410	0.00	\N	{}	\N	2026-05-10 23:02:59.529547+00	2026-05-10 23:02:59.529547+00
C_MP0DP7EYSK9T	KUDO_FUTURE	\N	\N	UCcklrwGfc0FtmOlMNCdJypQ	Brick Sound	VN	Active	Monetized	Healthy	0	0	356708	788.19	\N	{}	\N	2026-05-10 23:02:59.53067+00	2026-05-10 23:02:59.53067+00
C_MP0DP7EZCY42	KUDO_FUTURE	\N	\N	UCjTbz_ZmYhCaVW9PCLxwwkA	AM Bricks ESP	VN	Active	Monetized	Healthy	0	0	339683	404.96	\N	{}	\N	2026-05-10 23:02:59.531754+00	2026-05-10 23:02:59.531754+00
C_MP0DP7F07V1Z	KUDO_FUTURE	\N	\N	UC_CG81Mf50AGGukfa6Gp6Og	Bricks UP	VN	Active	Monetized	Healthy	0	0	319569	1437.69	\N	{}	\N	2026-05-10 23:02:59.532956+00	2026-05-10 23:02:59.532956+00
C_MP0DP7F2D5J5	KUDO_FUTURE	\N	\N	UC8SJWz_dwmTiz7Yulqk0tCA	RINO Bricks	VN	Active	Pending	Healthy	0	0	292989	0.00	\N	{}	\N	2026-05-10 23:02:59.534221+00	2026-05-10 23:02:59.534221+00
C_MP0DP7F3KTVP	KUDO_FUTURE	\N	\N	UCl2CRERz8u9mIoQBH4qINSA	BomBomBop KR	VN	Active	Monetized	Healthy	0	0	283101	639.44	\N	{}	\N	2026-05-10 23:02:59.535295+00	2026-05-10 23:02:59.535295+00
C_MP0DP7F4OZV0	KUDO_FUTURE	\N	\N	UC6wmHo_lphz59gfz5-YZp2g	BricksPIC	VN	Active	Monetized	Healthy	0	0	280075	88.32	\N	{}	\N	2026-05-10 23:02:59.536349+00	2026-05-10 23:02:59.536349+00
C_MP0DP7F5SOPZ	KUDO_FUTURE	\N	\N	UCnO00PU3sv4UP8JILsSP5Lg	Space Bricks	VN	Active	Monetized	Healthy	0	0	279435	891.48	\N	{}	\N	2026-05-10 23:02:59.53768+00	2026-05-10 23:02:59.53768+00
C_MP0DP7F6MLTF	KUDO_FUTURE	\N	\N	UCQDvGmV88RIEsLN860s1O8A	JAY Bricks	VN	Active	Monetized	Healthy	0	0	256131	795.62	\N	{}	\N	2026-05-10 23:02:59.538867+00	2026-05-10 23:02:59.538867+00
C_MP0DP7F7WJUE	KUDO_FUTURE	\N	\N	UCQ9VgeZoUZuQ-KOT0rX3IUg	BEAR Bricks JP	VN	Active	Monetized	Healthy	0	0	245772	0.11	\N	{}	\N	2026-05-10 23:02:59.540032+00	2026-05-10 23:02:59.540032+00
C_MP0DP7F9YR2Y	KUDO_FUTURE	\N	\N	UCAeJiYEiBYQnXa_cBnTycAQ	Blocky Bricks ESP	VN	Active	Monetized	Healthy	0	0	220639	303.58	\N	{}	\N	2026-05-10 23:02:59.541108+00	2026-05-10 23:02:59.541108+00
C_MP0DP7FA3KFI	KUDO_FUTURE	\N	\N	UCBMWRFjCMEfJxNQrSFczu1A	Pen Bricks	VN	Active	Monetized	Healthy	0	0	191076	1620.46	\N	{}	\N	2026-05-10 23:02:59.542136+00	2026-05-10 23:02:59.542136+00
C_MP0DP7FBA0GG	KUDO_FUTURE	\N	\N	UCjp48oThB1LPTWqjiRzT3wg	Dream Berry	VN	Active	Monetized	Healthy	0	0	188646	210.13	\N	{}	\N	2026-05-10 23:02:59.543171+00	2026-05-10 23:02:59.543171+00
C_MP0DP7FC4AZS	KUDO_FUTURE	\N	\N	UC0UXVxl_PFV5tHcsexwh7kw	BBBB Challenge	VN	Active	Monetized	Healthy	0	0	162733	31.98	\N	{}	\N	2026-05-10 23:02:59.544282+00	2026-05-10 23:02:59.544282+00
C_MP0DP7FDPE1X	KUDO_FUTURE	\N	\N	UCcEGMUQlc1VFoNwK9XzA-bA	AM Bricks FR	VN	Active	Monetized	Healthy	0	0	118121	403.19	\N	{}	\N	2026-05-10 23:02:59.545306+00	2026-05-10 23:02:59.545306+00
C_MP0DP7FE0RRB	KUDO_FUTURE	\N	\N	UCr2GRMpfIvlgpUrxEBoILJg	RM Lego Technic	VN	Active	Monetized	Healthy	0	0	111060	170.83	\N	{}	\N	2026-05-10 23:02:59.546392+00	2026-05-10 23:02:59.546392+00
C_MP0DP7FFQIOS	KUDO_FUTURE	\N	\N	UCfT04LF11p41S0m1flZoLCg	AM Bricks Galaxy	VN	Active	Monetized	Healthy	0	0	106926	1.03	\N	{}	\N	2026-05-10 23:02:59.547501+00	2026-05-10 23:02:59.547501+00
C_MP0DP7FGNCCJ	KUDO_FUTURE	\N	\N	UC_LdOd9U3yUTy8B6Tfrukxg	OMG Bricks	VN	Active	Pending	Healthy	0	0	77546	0.00	\N	{}	\N	2026-05-10 23:02:59.548556+00	2026-05-10 23:02:59.548556+00
C_MP0DP7FHU014	KUDO_FUTURE	\N	\N	UCk0KWGFp1-CbGqeTJ9x3Tdg	FUNZ Bricks Polish	VN	Active	Monetized	Healthy	0	0	45262	157.89	\N	{}	\N	2026-05-10 23:02:59.54958+00	2026-05-10 23:02:59.54958+00
C_MP0DP7FIFL4T	KUDO_FUTURE	\N	\N	UC6NSfNpsLP4gBpUO1EavlKw	Giant Spider	VN	Active	Monetized	Healthy	0	0	44993	232.11	\N	{}	\N	2026-05-10 23:02:59.550601+00	2026-05-10 23:02:59.550601+00
C_MP0DP7FJY5CS	KUDO_FUTURE	\N	\N	UCy-P7XG3GK4F64ofs3WjiVw	KOCAREİS	VN	Active	Monetized	Healthy	0	0	44863	50.45	\N	{}	\N	2026-05-10 23:02:59.551708+00	2026-05-10 23:02:59.551708+00
C_MP0DP7FKJ1UF	KUDO_FUTURE	\N	\N	UC9ZDzHQ-T246BDw_73NtPaQ	POP Bricks JP	VN	Active	Pending	Healthy	0	0	41924	0.00	\N	{}	\N	2026-05-10 23:02:59.552746+00	2026-05-10 23:02:59.552746+00
C_MP0DP7FLEYJR	KUDO_FUTURE	\N	\N	UCRNkDMGkOjPQ-e2_joGrjWg	PixSaga Mario	VN	Active	Monetized	Healthy	0	0	39934	133.37	\N	{}	\N	2026-05-10 23:02:59.553808+00	2026-05-10 23:02:59.553808+00
C_MP0DP7FMBV76	KUDO_FUTURE	\N	\N	UCeQeIQULktH_jZpYLH0A9vA	Tana Cubes DIY	VN	Active	Monetized	Healthy	0	0	17055	0.29	\N	{}	\N	2026-05-10 23:02:59.554885+00	2026-05-10 23:02:59.554885+00
C_MP0DP7FNPRY7	KUDO_FUTURE	\N	\N	UCNBXmoOnO-PFdGhpl6TybLg	ROBO BricksDE	VN	Active	Pending	Healthy	0	0	16595	0.00	\N	{}	\N	2026-05-10 23:02:59.556061+00	2026-05-10 23:02:59.556061+00
C_MP0DP7FPP4KC	KUDO_FUTURE	\N	\N	UCg1lu7wsPofT3aGZTuCRRLQ	Mira Life	VN	Active	Monetized	Healthy	0	0	12874	1.29	\N	{}	\N	2026-05-10 23:02:59.557186+00	2026-05-10 23:02:59.557186+00
C_MP0DP7FQ8TKF	KUDO_FUTURE	\N	\N	UCT5jeZ6YJCWxRn45Uve7LhQ	Tâm Quán Vô Thường	VN	Active	Pending	Healthy	0	0	9847	0.00	\N	{}	\N	2026-05-10 23:02:59.558237+00	2026-05-10 23:02:59.558237+00
C_MP0DP7FRMNU5	KUDO_FUTURE	\N	\N	UC3cFZDTHGhJnvTCCkNmPPJw	mzekiefe	VN	Active	Monetized	Healthy	0	0	4050	1.77	\N	{}	\N	2026-05-10 23:02:59.559272+00	2026-05-10 23:02:59.559272+00
C_MP0DP7FSYW4G	KUDO_FUTURE	\N	\N	UCsM9Ehzk26x12bAg2sWavKw	Kai Bricks	VN	Active	Pending	Healthy	0	0	3213	0.00	\N	{}	\N	2026-05-10 23:02:59.56036+00	2026-05-10 23:02:59.56036+00
C_MP0DP7FTFFLA	KUDO_FUTURE	\N	\N	UCd-ZJC25gsHb2I5fseQHTfA	Entertainment short	VN	Active	Pending	Healthy	0	0	2983	0.00	\N	{}	\N	2026-05-10 23:02:59.561386+00	2026-05-10 23:02:59.561386+00
C_MP0DP7FU5Q30	KUDO_FUTURE	\N	\N	UCuVgRqgYj6BVV5VI1Zlyt1g	shabarga78	VN	Active	Monetized	Healthy	0	0	2421	1.85	\N	{}	\N	2026-05-10 23:02:59.562419+00	2026-05-10 23:02:59.562419+00
C_MP0DP7FVZ53K	KUDO_FUTURE	\N	\N	UCxlFMLkxzO8NL6k81zoUqkQ	MartexYT	VN	Active	Pending	Healthy	0	0	2221	0.00	\N	{}	\N	2026-05-10 23:02:59.563554+00	2026-05-10 23:02:59.563554+00
C_MP0DP7FW14HR	KUDO_FUTURE	\N	\N	UCAFlJY73iKer4OTZFDx8bUA	Илья 13 YouTube	VN	Active	Pending	Healthy	0	0	2112	0.00	\N	{}	\N	2026-05-10 23:02:59.564594+00	2026-05-10 23:02:59.564594+00
C_MP0DP7FX4UAA	KUDO_FUTURE	\N	\N	UCGOR1n3MNRaZ3po6zC4zB4w	KuisCerdas	VN	Active	Pending	Healthy	0	0	2065	0.00	\N	{}	\N	2026-05-10 23:02:59.565623+00	2026-05-10 23:02:59.565623+00
C_MP0DP7FYBLVM	KUDO_FUTURE	\N	\N	UCgi9ZMBj2_k6p64Q6JpnqFA	Travel boast	VN	Active	Pending	Healthy	0	0	1936	0.00	\N	{}	\N	2026-05-10 23:02:59.566643+00	2026-05-10 23:02:59.566643+00
C_MP0DP7FZWKH4	KUDO_FUTURE	\N	\N	UCXvydkqfSj46co6EfXsSBAA	Vine Anasını	VN	Active	Monetized	Healthy	0	0	1788	0.38	\N	{}	\N	2026-05-10 23:02:59.567746+00	2026-05-10 23:02:59.567746+00
C_MP0DP7G0VITV	KUDO_FUTURE	\N	\N	UC1wKQdcHyu0ePvciLidghiA	prashant kumar vloger	VN	Active	Pending	Healthy	0	0	1377	0.00	\N	{}	\N	2026-05-10 23:02:59.568862+00	2026-05-10 23:02:59.568862+00
C_MP0DP7G1F20X	KUDO_FUTURE	\N	\N	UChvZYu2xEDqcQPNoUuVsInQ	Yuvraj King 302	VN	Active	Pending	Healthy	0	0	1342	0.00	\N	{}	\N	2026-05-10 23:02:59.569979+00	2026-05-10 23:02:59.569979+00
C_MP0DP7G2UUIQ	KUDO_FUTURE	\N	\N	UCcAVO-oEoecTzjp3O0of5BA	Ummetin Radyosu	VN	Active	Monetized	Healthy	0	0	1321	0.10	\N	{}	\N	2026-05-10 23:02:59.571049+00	2026-05-10 23:02:59.571049+00
C_MP0DP7G4B09E	KUDO_FUTURE	\N	\N	UCAmYjzaG3Sz938wv4j2vewg	Tina Paper DIY	VN	Active	Monetized	Healthy	0	0	1301	0.01	\N	{}	\N	2026-05-10 23:02:59.572088+00	2026-05-10 23:02:59.572088+00
C_MP0DP7G56AGL	KUDO_FUTURE	\N	\N	UC3aisqDtr-g2YLUBN6K4sDw	Tâm An Vô Thường	VN	Active	Pending	Healthy	0	0	1243	0.00	\N	{}	\N	2026-05-10 23:02:59.573112+00	2026-05-10 23:02:59.573112+00
C_MP0DP7G66EUT	KUDO_FUTURE	\N	\N	UC-AvHJKeX60u-sSrKtJEfdQ	stranger...@	VN	Active	Pending	Healthy	0	0	1070	0.00	\N	{}	\N	2026-05-10 23:02:59.57413+00	2026-05-10 23:02:59.57413+00
C_MP0DP7G7VIMA	KUDO_FUTURE	\N	\N	UCN90rsDR33a78lLmVhDwUMA	Abd ullah	VN	Active	Monetized	Healthy	0	0	1051	1.00	\N	{}	\N	2026-05-10 23:02:59.575139+00	2026-05-10 23:02:59.575139+00
C_MP0DP7G8TDRH	KUDO_FUTURE	\N	\N	UC7omhOgtG2XNBXi_NIicTuQ	bgsoftofficial	VN	Active	Monetized	Healthy	0	0	1019	0.34	\N	{}	\N	2026-05-10 23:02:59.576163+00	2026-05-10 23:02:59.576163+00
C_MP0DP7G9BXV5	KUDO_FUTURE	\N	\N	UC5uxghtDmq6kLZiO19Pv8RA	Halley Life	VN	Active	Monetized	Healthy	0	0	985	1.67	\N	{}	\N	2026-05-10 23:02:59.577166+00	2026-05-10 23:02:59.577166+00
C_MP0DP7GAJVON	KUDO_FUTURE	\N	\N	UCkb7n0dTrhznDj7Timj4oLQ	Ferdiii42	VN	Active	Pending	Healthy	0	0	853	0.00	\N	{}	\N	2026-05-10 23:02:59.578186+00	2026-05-10 23:02:59.578186+00
C_MP0DP7GBX8NC	KUDO_FUTURE	\N	\N	UCqXLzRHokJlMXahe5BKkPOA	Pháp Sư Hải ™	VN	Active	Pending	Healthy	0	0	697	0.00	\N	{}	\N	2026-05-10 23:02:59.579248+00	2026-05-10 23:02:59.579248+00
C_MP0DP7GCZYDQ	KUDO_FUTURE	\N	\N	UCkOtK-aBmubwguP3Qeqv5-A	ZOE PLAYTIME	VN	Active	Monetized	Healthy	0	0	635	2.15	\N	{}	\N	2026-05-10 23:02:59.580374+00	2026-05-10 23:02:59.580374+00
C_MP0DP7GD8NFT	KUDO_FUTURE	\N	\N	UCMxJsfB18HKbz4FH_3MkAhQ	Büşra Kandemir	VN	Active	Pending	Healthy	0	0	587	0.00	\N	{}	\N	2026-05-10 23:02:59.581464+00	2026-05-10 23:02:59.581464+00
C_MP0DP7GEBDID	KUDO_FUTURE	\N	\N	UCCtBrlP_LnmxSvXPttgc9uA	cernacerna	VN	Active	Monetized	Healthy	0	0	553	6.55	\N	{}	\N	2026-05-10 23:02:59.582879+00	2026-05-10 23:02:59.582879+00
C_MP0DP7GFZUKK	KUDO_FUTURE	\N	\N	UCSNGSocHxNquKbSMmPKudKw	ali kavus	VN	Active	Monetized	Healthy	0	0	452	0.33	\N	{}	\N	2026-05-10 23:02:59.583965+00	2026-05-10 23:02:59.583965+00
C_MP0DP7GH5G2C	KUDO_FUTURE	\N	\N	UCcbKjeziAmxZ-fwOLnL68eQ	Dini Çizgi Filmler	VN	Active	Monetized	Healthy	0	0	432	0.07	\N	{}	\N	2026-05-10 23:02:59.585161+00	2026-05-10 23:02:59.585161+00
C_MP0DP7GIA53H	KUDO_FUTURE	\N	\N	UCCf9euksjrcHsfU-_MfBhDA	Barış aydoğdu	VN	Active	Monetized	Healthy	0	0	429	0.07	\N	{}	\N	2026-05-10 23:02:59.586395+00	2026-05-10 23:02:59.586395+00
C_MP0DP7GJHLTF	KUDO_FUTURE	\N	\N	UCGCmL9cFlVkiQFmmHIGBGcQ	Rahmet Deryası	VN	Active	Monetized	Healthy	0	0	400	0.01	\N	{}	\N	2026-05-10 23:02:59.587518+00	2026-05-10 23:02:59.587518+00
C_MP0DP7GK2CSU	KUDO_FUTURE	\N	\N	UC5isGfWpVAthhqHbjmPes6g	Andijonli Beori	VN	Active	Monetized	Healthy	0	0	394	2.79	\N	{}	\N	2026-05-10 23:02:59.588788+00	2026-05-10 23:02:59.588788+00
C_MP0DP7GL8OYX	KUDO_FUTURE	\N	\N	UCzQEsZHfvnPUP0xBM1Ztn-g	Диян	VN	Active	Pending	Healthy	0	0	380	0.00	\N	{}	\N	2026-05-10 23:02:59.589847+00	2026-05-10 23:02:59.589847+00
C_MP0DP7GMPUCM	KUDO_FUTURE	\N	\N	UCFEoZnZmzZLnnLcCMlNsvsg	Ewlad TV-ئەۋلاد ئېكرانى	VN	Active	Monetized	Healthy	0	0	357	1.75	\N	{}	\N	2026-05-10 23:02:59.590871+00	2026-05-10 23:02:59.590871+00
C_MP0DP7GN1ZWR	KUDO_FUTURE	\N	\N	UCBZGUzGDSzCFTfe4n8UxC4A	zeki99zeki99	VN	Active	Monetized	Healthy	0	0	352	0.00	\N	{}	\N	2026-05-10 23:02:59.591906+00	2026-05-10 23:02:59.591906+00
C_MP0DP7GOS9Y1	KUDO_FUTURE	\N	\N	UChTFFR4MkmdiV-TU8819wDQ	TasavvufKestel	VN	Active	Monetized	Healthy	0	0	304	0.16	\N	{}	\N	2026-05-10 23:02:59.592921+00	2026-05-10 23:02:59.592921+00
C_MP0DP7GP1YXQ	KUDO_FUTURE	\N	\N	UCLQfO1nun4pijU1wVTPjd-A	Ali Baykutalp ALİYYEN VELİYYULLAH	VN	Active	Monetized	Healthy	0	0	302	0.17	\N	{}	\N	2026-05-10 23:02:59.593945+00	2026-05-10 23:02:59.593945+00
C_MP0DP7GQDDSD	KUDO_FUTURE	\N	\N	UCXM-QYFxyKuYgaj9PnJ4SvQ	flaffywaffy	VN	Active	Monetized	Healthy	0	0	301	0.83	\N	{}	\N	2026-05-10 23:02:59.594968+00	2026-05-10 23:02:59.594968+00
C_MP0DP7GR5B3Q	KUDO_FUTURE	\N	\N	UCMQ4j1Hv2gLg2YbyR7EwAIA	Spider Jump IDN	VN	Active	Monetized	Healthy	0	0	301	0.62	\N	{}	\N	2026-05-10 23:02:59.59599+00	2026-05-10 23:02:59.59599+00
C_MP0DP7GSCBEJ	KUDO_FUTURE	\N	\N	UCNgoDB3qAvffpjCgTcB7O8Q	2AP reaction 2.0	VN	Active	Pending	Healthy	0	0	272	0.00	\N	{}	\N	2026-05-10 23:02:59.597009+00	2026-05-10 23:02:59.597009+00
C_MP0DP7GUX2AW	KUDO_FUTURE	\N	\N	UCKINm-RjIHa4EIbIs7WxzxA	Aman Raj	VN	Active	Pending	Healthy	0	0	263	0.00	\N	{}	\N	2026-05-10 23:02:59.59819+00	2026-05-10 23:02:59.59819+00
C_MP0DP7GVE7LW	KUDO_FUTURE	\N	\N	UC6MRu_TrdEdPFj94y4Dl5iw	Tarih Kanalı	VN	Active	Monetized	Healthy	0	0	247	0.03	\N	{}	\N	2026-05-10 23:02:59.599431+00	2026-05-10 23:02:59.599431+00
C_MP0DP7GWBZUD	KUDO_FUTURE	\N	\N	UCT4-3L1SYRze7oXms2OsFzA	Ponbonpop France	VN	Active	Pending	Healthy	0	0	234	0.00	\N	{}	\N	2026-05-10 23:02:59.600672+00	2026-05-10 23:02:59.600672+00
C_MP0DP7GX1X8E	KUDO_FUTURE	\N	\N	UCxh17OZC-6wAeoXUQP6edgA	نتالي للإنتاج والتوزيع الفني	VN	Active	Monetized	Healthy	0	0	196	0.03	\N	{}	\N	2026-05-10 23:02:59.60192+00	2026-05-10 23:02:59.60192+00
C_MP0DP7GYXE5Q	KUDO_FUTURE	\N	\N	UCJg7JHxVaf5sGGy7Z1xU7Fg	Nihat Hatipoğlu Sohbetleri	VN	Active	Monetized	Healthy	0	0	187	0.05	\N	{}	\N	2026-05-10 23:02:59.603063+00	2026-05-10 23:02:59.603063+00
C_MP0DP7H0JHM2	KUDO_FUTURE	\N	\N	UC337RBvXqEkcyJZwnanFfaA	CGTV Official Channel	VN	Active	Pending	Healthy	0	0	181	0.00	\N	{}	\N	2026-05-10 23:02:59.604168+00	2026-05-10 23:02:59.604168+00
C_MP0DP7H1FBSE	KUDO_FUTURE	\N	\N	UCwIVkmKqaqKUgafkQmVuInQ	brittanyaniel	VN	Active	Monetized	Healthy	0	0	178	0.02	\N	{}	\N	2026-05-10 23:02:59.605241+00	2026-05-10 23:02:59.605241+00
C_MP0DP7H2JH9I	KUDO_FUTURE	\N	\N	UCfXxDQm9iM-bpmu46-nW_5w	Büşra'nın Dünyası	VN	Active	Monetized	Healthy	0	0	174	0.08	\N	{}	\N	2026-05-10 23:02:59.606259+00	2026-05-10 23:02:59.606259+00
C_MP0DP7H3KH3R	KUDO_FUTURE	\N	\N	UCQfRbo0hkJZg9qhDfcijCMA	Donanım Günlüğü	VN	Active	Monetized	Healthy	0	0	171	0.12	\N	{}	\N	2026-05-10 23:02:59.60727+00	2026-05-10 23:02:59.60727+00
C_MP0DP7H4CVEM	KUDO_FUTURE	\N	\N	UCNAriKh0v_28kFq2dNfIFYw	Matt Siddorn	VN	Active	Pending	Healthy	0	0	165	0.00	\N	{}	\N	2026-05-10 23:02:59.608333+00	2026-05-10 23:02:59.608333+00
C_MP0DP7H5WEFN	KUDO_FUTURE	\N	\N	UCdfIvktkt56cN1iV23TihbQ	Hana Paper DIY	VN	Active	Pending	Healthy	0	0	164	0.00	\N	{}	\N	2026-05-10 23:02:59.60936+00	2026-05-10 23:02:59.60936+00
C_MP0DP7H6G3C8	KUDO_FUTURE	\N	\N	UCrM6BpF2S94RwjBNLvNGQig	Aldric S	VN	Active	Pending	Healthy	0	0	158	0.00	\N	{}	\N	2026-05-10 23:02:59.610362+00	2026-05-10 23:02:59.610362+00
C_MP0DP7H7W8UF	KUDO_FUTURE	\N	\N	UCka8RaYLtyc7Ww4qH6adPgg	Enes Batur	VN	Active	Monetized	Healthy	0	0	154	0.07	\N	{}	\N	2026-05-10 23:02:59.611489+00	2026-05-10 23:02:59.611489+00
C_MP0DP7H8BG65	KUDO_FUTURE	\N	\N	UCARW5wR8WnULAwVXNXXp2ng	Mahboob India Bihar786	VN	Active	Pending	Healthy	0	0	136	0.00	\N	{}	\N	2026-05-10 23:02:59.612535+00	2026-05-10 23:02:59.612535+00
C_MP0DP7H9YMO4	KUDO_FUTURE	\N	\N	UCVUz7Y4IblJE1qyqpVnVQxA	comgooglemail	VN	Active	Monetized	Healthy	0	0	135	0.33	\N	{}	\N	2026-05-10 23:02:59.613541+00	2026-05-10 23:02:59.613541+00
C_MP0DP7HA12GL	KUDO_FUTURE	\N	\N	UCxTWNrxZMPWo8HzUBRg8dnQ	AnatoliaFilmcilik	VN	Active	Monetized	Healthy	0	0	129	0.03	\N	{}	\N	2026-05-10 23:02:59.61457+00	2026-05-10 23:02:59.61457+00
C_MP0DP7HB02HY	KUDO_FUTURE	\N	\N	UCRwxu_t0RdJu67iXp2reF1w	cyprus0nicosia	VN	Active	Monetized	Healthy	0	0	125	0.00	\N	{}	\N	2026-05-10 23:02:59.615625+00	2026-05-10 23:02:59.615625+00
C_MP0DP7HCJAPR	KUDO_FUTURE	\N	\N	UCDq5-g2C2u7Z_v6gIPXL9MA	Pepee Canım Benim	VN	Active	Monetized	Healthy	0	0	121	0.01	\N	{}	\N	2026-05-10 23:02:59.616707+00	2026-05-10 23:02:59.616707+00
C_MP0DP7HDU5AR	KUDO_FUTURE	\N	\N	UCsBNLib7QWBK72zJI8wUXqQ	HonestyIsKey	VN	Active	Monetized	Healthy	0	0	114	0.24	\N	{}	\N	2026-05-10 23:02:59.617772+00	2026-05-10 23:02:59.617772+00
C_MP0DP7HETBZ9	KUDO_FUTURE	\N	\N	UCt6KKwSjPxyBLOXcXQ-nQEw	ROBO Bricks Korea	VN	Active	Pending	Healthy	0	0	111	0.00	\N	{}	\N	2026-05-10 23:02:59.618823+00	2026-05-10 23:02:59.618823+00
C_MP0DP7HF721H	KUDO_FUTURE	\N	\N	UCkQivTg314B7JtPCTrMq1iQ	Buffalo people	VN	Active	Pending	Healthy	0	0	110	0.00	\N	{}	\N	2026-05-10 23:02:59.619885+00	2026-05-10 23:02:59.619885+00
C_MP0DP7HGQA5U	KUDO_FUTURE	\N	\N	UC0Luhd5oroyAg6kqDbjqr8w	pharmrep06	VN	Active	Monetized	Healthy	0	0	107	0.47	\N	{}	\N	2026-05-10 23:02:59.620924+00	2026-05-10 23:02:59.620924+00
C_MP0DP7HIVU3Y	KUDO_FUTURE	\N	\N	UCjLZTZkuLORJhjQ8L39Fe2g	Funny short	VN	Active	Pending	Healthy	0	0	100	0.00	\N	{}	\N	2026-05-10 23:02:59.622081+00	2026-05-10 23:02:59.622081+00
C_MP0DP7HJOPL3	KUDO_FUTURE	\N	\N	UCk5PWuTHhj9UVgPc4_G0w0w	Expo Savvy	VN	Active	Pending	Healthy	0	0	97	0.00	\N	{}	\N	2026-05-10 23:02:59.623153+00	2026-05-10 23:02:59.623153+00
C_MP0DP7HKIALN	KUDO_FUTURE	\N	\N	UCFTyKizBBGwOxqbVFHu_QrA	sakura	VN	Active	Pending	Healthy	0	0	95	0.00	\N	{}	\N	2026-05-10 23:02:59.624264+00	2026-05-10 23:02:59.624264+00
C_MP0DP7HLZ6G9	KUDO_FUTURE	\N	\N	UCS3I6C0dbgbbalFvzIaJicw	Kim Kimdir	VN	Active	Monetized	Healthy	0	0	94	0.01	\N	{}	\N	2026-05-10 23:02:59.625273+00	2026-05-10 23:02:59.625273+00
C_MP0DP7HMP1N0	KUDO_FUTURE	\N	\N	UC9md95inJwkE60T3fyEiGtw	Raju Sen	VN	Active	Pending	Healthy	0	0	89	0.00	\N	{}	\N	2026-05-10 23:02:59.626278+00	2026-05-10 23:02:59.626278+00
C_MP0DP7HNIZC1	KUDO_FUTURE	\N	\N	UC4a5sspKb69LI4L2msCO90A	ROBO Bricks PT	VN	Active	Pending	Healthy	0	0	85	0.00	\N	{}	\N	2026-05-10 23:02:59.627596+00	2026-05-10 23:02:59.627596+00
C_MP0DP7HOAM48	KUDO_FUTURE	\N	\N	UCxBm48NyRbFRNgy7vWEuzRg	DiaryofMalcolmX	VN	Active	Monetized	Healthy	0	0	84	0.20	\N	{}	\N	2026-05-10 23:02:59.628658+00	2026-05-10 23:02:59.628658+00
C_MP0DP7HPEQP7	KUDO_FUTURE	\N	\N	UCaSp7fA2bM6HDcBMHZ2lpYg	film trailer	VN	Active	Monetized	Healthy	0	0	82	0.03	\N	{}	\N	2026-05-10 23:02:59.629676+00	2026-05-10 23:02:59.629676+00
C_MP0DP7HQ87IL	KUDO_FUTURE	\N	\N	UCVQnDYzuPdXfhQG-V3BzdOg	MOHIT MYCAL	VN	Active	Pending	Healthy	0	0	81	0.00	\N	{}	\N	2026-05-10 23:02:59.630695+00	2026-05-10 23:02:59.630695+00
C_MP0DP7HR2YZT	KUDO_FUTURE	\N	\N	UCIvV1ROLudGFEhTJHgTY4dQ	R L electrical 50k	VN	Active	Pending	Healthy	0	0	81	0.00	\N	{}	\N	2026-05-10 23:02:59.631794+00	2026-05-10 23:02:59.631794+00
C_MP0DP7HS2ONH	KUDO_FUTURE	\N	\N	UCYagAXJo3Wlmzndvqwfpjjg	Yavuz Kral	VN	Active	Monetized	Healthy	0	0	76	0.04	\N	{}	\N	2026-05-10 23:02:59.632869+00	2026-05-10 23:02:59.632869+00
C_MP0DP7HTF7KY	KUDO_FUTURE	\N	\N	UCI1J6YH1BQtU2vkpzNsyFLQ	ErikS22	VN	Active	Pending	Healthy	0	0	70	0.00	\N	{}	\N	2026-05-10 23:02:59.633994+00	2026-05-10 23:02:59.633994+00
C_MP0DP7HUMNAM	KUDO_FUTURE	\N	\N	UCqrr6xWqRpS3TyCZTxOGudA	RadicalDemocracyNow	VN	Active	Monetized	Healthy	0	0	67	0.01	\N	{}	\N	2026-05-10 23:02:59.635016+00	2026-05-10 23:02:59.635016+00
C_MP0DP7HVTS8V	KUDO_FUTURE	\N	\N	UCUyPrT2Tn6vQBPXGheQDcyg	AndrosEnigmaX	VN	Active	Pending	Healthy	0	0	62	0.00	\N	{}	\N	2026-05-10 23:02:59.636039+00	2026-05-10 23:02:59.636039+00
C_MP0DP7HXE8YO	KUDO_FUTURE	\N	\N	UCggJmYhtxBk1naIbZN541pw	Islam Channel	VN	Active	Monetized	Healthy	0	0	62	0.00	\N	{}	\N	2026-05-10 23:02:59.637067+00	2026-05-10 23:02:59.637067+00
C_MP0DP7HYOLPV	KUDO_FUTURE	\N	\N	UC8ukW9eOEvO5N4XUrcPSEnA	ROBO Bricks Fr	VN	Active	Pending	Healthy	0	0	61	0.00	\N	{}	\N	2026-05-10 23:02:59.638078+00	2026-05-10 23:02:59.638078+00
C_MP0DP7HZWZVB	KUDO_FUTURE	\N	\N	UC4bEnvHY7ERomGztBwvdFCA	ايوب الجيلاني	VN	Active	Monetized	Healthy	0	0	60	0.00	\N	{}	\N	2026-05-10 23:02:59.639092+00	2026-05-10 23:02:59.639092+00
C_MP0DP7I0Q8ND	KUDO_FUTURE	\N	\N	UCjpjZvW-QPCYo4lhqm8O3uw	Spider Bu	VN	Active	Monetized	Healthy	0	0	59	0.01	\N	{}	\N	2026-05-10 23:02:59.640151+00	2026-05-10 23:02:59.640151+00
C_MP0DP7I1ZZCT	KUDO_FUTURE	\N	\N	UC5V4R3HimkRnLVnVr9SWdPQ	tonzi the corgi	VN	Active	Pending	Healthy	0	0	58	0.00	\N	{}	\N	2026-05-10 23:02:59.641213+00	2026-05-10 23:02:59.641213+00
C_MP0DP7I25FYX	KUDO_FUTURE	\N	\N	UC56-iyFMK4gsRDcjhf9YUlA	JGr124 Katze	VN	Active	Monetized	Healthy	0	0	57	0.01	\N	{}	\N	2026-05-10 23:02:59.642281+00	2026-05-10 23:02:59.642281+00
C_MP0DP7I36M7J	KUDO_FUTURE	\N	\N	UChxh-_Yw7jg3cytI-9cKDug	Brick Fun Kids	VN	Active	Pending	Healthy	0	0	57	0.00	\N	{}	\N	2026-05-10 23:02:59.643413+00	2026-05-10 23:02:59.643413+00
C_MP0DP7I4O4K2	KUDO_FUTURE	\N	\N	UCy49ENFrnKkHFZh1rm3_gCw	Chom Chom	VN	Active	Monetized	Healthy	0	0	56	0.02	\N	{}	\N	2026-05-10 23:02:59.644419+00	2026-05-10 23:02:59.644419+00
C_MP0DP7I51PNC	KUDO_FUTURE	\N	\N	UC7P9ERYntgh9_r07S6yrdNQ	اغاني عفرينية	VN	Active	Monetized	Healthy	0	0	56	0.00	\N	{}	\N	2026-05-10 23:02:59.645582+00	2026-05-10 23:02:59.645582+00
C_MP0DP7I6S1CR	KUDO_FUTURE	\N	\N	UCOuut8LRhOD_rj3jNjG655w	HaHaHap FR	VN	Active	Pending	Healthy	0	0	54	0.00	\N	{}	\N	2026-05-10 23:02:59.646598+00	2026-05-10 23:02:59.646598+00
C_MP0DP7I7FVGO	KUDO_FUTURE	\N	\N	UCfjrr3lPY0aoDhvKUqNrayA	VLMuseum	VN	Active	Monetized	Healthy	0	0	53	0.05	\N	{}	\N	2026-05-10 23:02:59.64771+00	2026-05-10 23:02:59.64771+00
C_MP0DP7I8IHWI	KUDO_FUTURE	\N	\N	UCyMVRb9mlUAt4AOAYe_5Lkw	General Shorts	VN	Active	Pending	Healthy	0	0	53	0.00	\N	{}	\N	2026-05-10 23:02:59.648819+00	2026-05-10 23:02:59.648819+00
C_MP0DP7I97JNL	KUDO_FUTURE	\N	\N	UC8flcgvNvuk7ykeZ4BaB7mg	gulsum8581	VN	Active	Monetized	Healthy	0	0	50	0.01	\N	{}	\N	2026-05-10 23:02:59.649859+00	2026-05-10 23:02:59.649859+00
C_MP0DP7IAT8H5	KUDO_FUTURE	\N	\N	UCP4EeA9tuNpHHYmAz9MoW6w	Mustafa Gül	VN	Active	Pending	Healthy	0	0	48	0.00	\N	{}	\N	2026-05-10 23:02:59.650888+00	2026-05-10 23:02:59.650888+00
C_MP0DP7IB3AQW	KUDO_FUTURE	\N	\N	UC1-Iz-XdfH7ZTyEywGcBOBw	Roshnii Talks	VN	Active	Pending	Healthy	0	0	48	0.00	\N	{}	\N	2026-05-10 23:02:59.65193+00	2026-05-10 23:02:59.65193+00
C_MP0DP7ICM1DW	KUDO_FUTURE	\N	\N	UCc1VSLi5Viguv3bkmWiJ_mA	Tukinemcg	VN	Active	Pending	Healthy	0	0	47	0.00	\N	{}	\N	2026-05-10 23:02:59.652982+00	2026-05-10 23:02:59.652982+00
C_MP0DP7IDKC32	KUDO_FUTURE	\N	\N	UCZN-ov5gXYB_MLBq1IFXiyQ	Melique Thomas	VN	Active	Monetized	Healthy	0	0	47	0.02	\N	{}	\N	2026-05-10 23:02:59.653995+00	2026-05-10 23:02:59.653995+00
C_MP0DP7IEJ55W	KUDO_FUTURE	\N	\N	UCEjIOW5MGpV0DzO5REGeQUg	EmmanKon	VN	Active	Monetized	Healthy	0	0	45	0.01	\N	{}	\N	2026-05-10 23:02:59.655018+00	2026-05-10 23:02:59.655018+00
C_MP0DP7IFGNXN	KUDO_FUTURE	\N	\N	UCYfU77fC1ZMNOK6TgwNI25g	YUDISTIRA Channel	VN	Active	Pending	Healthy	0	0	43	0.00	\N	{}	\N	2026-05-10 23:02:59.65604+00	2026-05-10 23:02:59.65604+00
C_MP0DP7IHDUZV	KUDO_FUTURE	\N	\N	UCqLqdj37euw4QrV7_QmWX0A	Dusty Sweeper	VN	Active	Monetized	Healthy	0	0	41	0.13	\N	{}	\N	2026-05-10 23:02:59.657077+00	2026-05-10 23:02:59.657077+00
C_MP0DP7IIFUB9	KUDO_FUTURE	\N	\N	UCiNH-QoJG4TV30XgdU6ZC8g	HaHaHap ES	VN	Active	Pending	Healthy	0	0	40	0.00	\N	{}	\N	2026-05-10 23:02:59.658137+00	2026-05-10 23:02:59.658137+00
C_MP0DP7IJN78M	KUDO_FUTURE	\N	\N	UCp3ZaN62RaK7wsi5CiC2_Pg	Arzu Eliyeva	VN	Active	Monetized	Healthy	0	0	39	0.00	\N	{}	\N	2026-05-10 23:02:59.659265+00	2026-05-10 23:02:59.659265+00
C_MP0DP7IK9EAG	KUDO_FUTURE	\N	\N	UCoANmZc69wqm6eHZ4R8BXbw	videosfito	VN	Active	Monetized	Healthy	0	0	39	0.00	\N	{}	\N	2026-05-10 23:02:59.660375+00	2026-05-10 23:02:59.660375+00
C_MP0DP7IL736V	KUDO_FUTURE	\N	\N	UCZy9oORgd6_r-tlqrzqNGBw	MG GAMER	VN	Active	Pending	Healthy	0	0	38	0.00	\N	{}	\N	2026-05-10 23:02:59.661451+00	2026-05-10 23:02:59.661451+00
C_MP0DP7IMZV1B	KUDO_FUTURE	\N	\N	UCs2m3FMd5r75FIQAqte9B4g	VishalRaja014	VN	Active	Pending	Healthy	0	0	38	0.00	\N	{}	\N	2026-05-10 23:02:59.6626+00	2026-05-10 23:02:59.6626+00
C_MP0DP7INH155	KUDO_FUTURE	\N	\N	UCrsoh7qWS0FLydiHDSmbUEg	Bingo	VN	Active	Pending	Healthy	0	0	38	0.00	\N	{}	\N	2026-05-10 23:02:59.663739+00	2026-05-10 23:02:59.663739+00
C_MP0DP7IOAC5A	KUDO_FUTURE	\N	\N	UC0ZYUFTK-DIOkqnzU_bXTaQ	medeniyetnehri	VN	Active	Pending	Healthy	0	0	37	0.00	\N	{}	\N	2026-05-10 23:02:59.664804+00	2026-05-10 23:02:59.664804+00
C_MP0DP7IPW0P8	KUDO_FUTURE	\N	\N	UC69ZwDQQ3mxM68b_lpYLtcg	Ivan bricks	VN	Active	Pending	Healthy	0	0	36	0.00	\N	{}	\N	2026-05-10 23:02:59.665857+00	2026-05-10 23:02:59.665857+00
C_MP0DP7IQ0FTB	KUDO_FUTURE	\N	\N	UCMhqMdf8DJLuKsHT3fXVKhw	HEAVY GAMER🔭	VN	Active	Pending	Healthy	0	0	35	0.00	\N	{}	\N	2026-05-10 23:02:59.666887+00	2026-05-10 23:02:59.666887+00
C_MP0DP7IRCNIA	KUDO_FUTURE	\N	\N	UCO3xEejQkQcb9D3fpsl1zzw	Jannat Rafia	VN	Active	Pending	Healthy	0	0	35	0.00	\N	{}	\N	2026-05-10 23:02:59.667915+00	2026-05-10 23:02:59.667915+00
C_MP0DP7ISP94Q	KUDO_FUTURE	\N	\N	UCn0JQ5TVJZi3d9hJZcnpSpQ	เปิดฟ้าตะลอนแหลกวงชื่นอุทัย	VN	Active	Pending	Healthy	0	0	33	0.00	\N	{}	\N	2026-05-10 23:02:59.668932+00	2026-05-10 23:02:59.668932+00
C_MP0DP7ITOW50	KUDO_FUTURE	\N	\N	UCFzJnn1u2QzbA3dEUviwvCg	Önce Namaz	VN	Active	Monetized	Healthy	0	0	32	0.00	\N	{}	\N	2026-05-10 23:02:59.669948+00	2026-05-10 23:02:59.669948+00
C_MP0DP7IU5J4C	KUDO_FUTURE	\N	\N	UCkH_kWmW3UUJrywEj7o5AQg	NISHA SHORTS VIDEO	VN	Active	Pending	Healthy	0	0	32	0.00	\N	{}	\N	2026-05-10 23:02:59.670961+00	2026-05-10 23:02:59.670961+00
C_MP0DP7IWCWAZ	KUDO_FUTURE	\N	\N	UCKlq-HNffwgLErJdm8hUINQ	BeklenenNesil	VN	Active	Monetized	Healthy	0	0	31	0.01	\N	{}	\N	2026-05-10 23:02:59.672337+00	2026-05-10 23:02:59.672337+00
C_MP0DP7IXDBB6	KUDO_FUTURE	\N	\N	UCRStSTV460HcUuNYbCVZHZA	العربية AD NAT GEO	VN	Active	Pending	Healthy	0	0	31	0.00	\N	{}	\N	2026-05-10 23:02:59.673367+00	2026-05-10 23:02:59.673367+00
C_MP0DP7IYGUIO	KUDO_FUTURE	\N	\N	UCGZ_eoQ_POMUDyiJIAL3JaQ	paname20	VN	Active	Monetized	Healthy	0	0	30	0.02	\N	{}	\N	2026-05-10 23:02:59.6744+00	2026-05-10 23:02:59.6744+00
C_MP0DP7IZJQIJ	KUDO_FUTURE	\N	\N	UChl-spMGrl73Zp_IDQbjcfg	tom500	VN	Active	Pending	Healthy	0	0	30	0.00	\N	{}	\N	2026-05-10 23:02:59.675452+00	2026-05-10 23:02:59.675452+00
C_MP0DP7J0G9Q9	KUDO_FUTURE	\N	\N	UCPLxdUp7Oo3XhWGsDfmaXJg	Fahri Karakehya	VN	Active	Pending	Healthy	0	0	29	0.00	\N	{}	\N	2026-05-10 23:02:59.676559+00	2026-05-10 23:02:59.676559+00
C_MP0DP7J1IZHS	KUDO_FUTURE	\N	\N	UC5EK9sz5JyekUYPbDjflSpA	Uyghur IslamTv	VN	Active	Monetized	Healthy	0	0	29	0.02	\N	{}	\N	2026-05-10 23:02:59.677612+00	2026-05-10 23:02:59.677612+00
C_MP0DP7J26HUD	KUDO_FUTURE	\N	\N	UCqn2u3I1pXyGMSN98O_WqEw	KIZ KULESİ TV	VN	Active	Pending	Healthy	0	0	29	0.00	\N	{}	\N	2026-05-10 23:02:59.678637+00	2026-05-10 23:02:59.678637+00
C_MP0DP7J3VRST	KUDO_FUTURE	\N	\N	UCNbUnJDfpicHZpCs8pJnlaQ	BiBi Spider	VN	Active	Monetized	Healthy	0	0	28	0.00	\N	{}	\N	2026-05-10 23:02:59.679732+00	2026-05-10 23:02:59.679732+00
C_MP0DP7J4VT2S	KUDO_FUTURE	\N	\N	UCYSoGsU27_e0gQ2hix8HB5g	Mustafa	VN	Active	Monetized	Healthy	0	0	27	0.03	\N	{}	\N	2026-05-10 23:02:59.680774+00	2026-05-10 23:02:59.680774+00
C_MP0DP7J5Q3LW	KUDO_FUTURE	\N	\N	UClJTaXzqEdWylfUPIQP8szg	Michal Solomon	VN	Active	Pending	Healthy	0	0	26	0.00	\N	{}	\N	2026-05-10 23:02:59.681802+00	2026-05-10 23:02:59.681802+00
C_MP0DP7J690ZP	KUDO_FUTURE	\N	\N	UCk9IuNZtlQoKQh_yL_oCTtA	Mane Yapim	VN	Active	Pending	Healthy	0	0	25	0.00	\N	{}	\N	2026-05-10 23:02:59.682825+00	2026-05-10 23:02:59.682825+00
C_MP0DP7J7T787	KUDO_FUTURE	\N	\N	UCaGrg-1rqOLy-B3k4qIKolw	TheOnlyLegoBuilder	VN	Active	Pending	Healthy	0	0	25	0.00	\N	{}	\N	2026-05-10 23:02:59.683851+00	2026-05-10 23:02:59.683851+00
C_MP0DP7J8RNYS	KUDO_FUTURE	\N	\N	UCaGPRQOresS9B1lkvQQ4Urg	Sekine Yolu	VN	Active	Pending	Healthy	0	0	25	0.00	\N	{}	\N	2026-05-10 23:02:59.684874+00	2026-05-10 23:02:59.684874+00
C_MP0DP7J9HDSC	KUDO_FUTURE	\N	\N	UCcFw9qgRZ1ZjH40b0ZJEM5A	Caner Durukan	VN	Active	Monetized	Healthy	0	0	24	0.03	\N	{}	\N	2026-05-10 23:02:59.685885+00	2026-05-10 23:02:59.685885+00
C_MP0DP7JAIBYZ	KUDO_FUTURE	\N	\N	UCvG8mEpww-JT4H1rwa654eg	See Black See Power	VN	Active	Monetized	Healthy	0	0	24	0.00	\N	{}	\N	2026-05-10 23:02:59.686928+00	2026-05-10 23:02:59.686928+00
C_MP0DP7JBPU7Q	KUDO_FUTURE	\N	\N	UCVoCxDBnawivPfnBnzaxI2g	ВВС	VN	Active	Monetized	Healthy	0	0	24	0.01	\N	{}	\N	2026-05-10 23:02:59.687955+00	2026-05-10 23:02:59.687955+00
C_MP0DP7JCLLXT	KUDO_FUTURE	\N	\N	UCaOAmw4ofaet1tblldFJO8A	Amanda Salcedo	VN	Active	Pending	Healthy	0	0	23	0.00	\N	{}	\N	2026-05-10 23:02:59.688977+00	2026-05-10 23:02:59.688977+00
C_MP0DP7JDVMVY	KUDO_FUTURE	\N	\N	UC44MysFueCl49p8gAjBWXTA	@Nizam M	VN	Active	Pending	Healthy	0	0	23	0.00	\N	{}	\N	2026-05-10 23:02:59.690007+00	2026-05-10 23:02:59.690007+00
C_MP0DP7JEKNHE	KUDO_FUTURE	\N	\N	UCIr1Ga9aoqQFc3w8E__Gt0A	Anab Ruesta ramos	VN	Active	Pending	Healthy	0	0	22	0.00	\N	{}	\N	2026-05-10 23:02:59.691082+00	2026-05-10 23:02:59.691082+00
C_MP0DP7JGP6GO	KUDO_FUTURE	\N	\N	UCHoBnXpW9zGF2kq9nYiPKfQ	Lion Hyenawars	VN	Active	Monetized	Healthy	0	0	22	0.01	\N	{}	\N	2026-05-10 23:02:59.692184+00	2026-05-10 23:02:59.692184+00
C_MP0DP7JH14ED	KUDO_FUTURE	\N	\N	UCaCNH1xSJdgh0MeuDWPA-Pg	kadir özdemir	VN	Active	Monetized	Healthy	0	0	22	0.00	\N	{}	\N	2026-05-10 23:02:59.69326+00	2026-05-10 23:02:59.69326+00
C_MP0DP7JI6Y5D	KUDO_FUTURE	\N	\N	UCmxZQAniau_aE-6C6B6i4yg	Hüseyin DEMİRCİ	VN	Active	Monetized	Healthy	0	0	22	0.00	\N	{}	\N	2026-05-10 23:02:59.694463+00	2026-05-10 23:02:59.694463+00
C_MP0DP7JJ5JPW	KUDO_FUTURE	\N	\N	UCT2kDbrDNbwHOELrEL0uuGA	CRAFTORA DIY	VN	Active	Pending	Healthy	0	0	21	0.00	\N	{}	\N	2026-05-10 23:02:59.695629+00	2026-05-10 23:02:59.695629+00
C_MP0DP7JKEJ7N	KUDO_FUTURE	\N	\N	UChqGZJdR6TjmmvwV50TGKWA	Gg gunda	VN	Active	Pending	Healthy	0	0	21	0.00	\N	{}	\N	2026-05-10 23:02:59.696718+00	2026-05-10 23:02:59.696718+00
C_MP0DP7JLNBBX	KUDO_FUTURE	\N	\N	UCw2iULqOD6nSmXH26EQDc-A	Thị Hoa Trần	VN	Active	Pending	Healthy	0	0	20	0.00	\N	{}	\N	2026-05-10 23:02:59.69775+00	2026-05-10 23:02:59.69775+00
C_MP0DP7JMXYSU	KUDO_FUTURE	\N	\N	UCaF_VSWJVm9Gotyr31y_qWQ	aliosman yaylacı	VN	Active	Monetized	Healthy	0	0	20	0.00	\N	{}	\N	2026-05-10 23:02:59.698775+00	2026-05-10 23:02:59.698775+00
C_MP0DP7JNZ8U9	KUDO_FUTURE	\N	\N	UCfgnu0yYCMCZFgMlNB8YdLg	Ciclo De Formação Marcus Garvey	VN	Active	Pending	Healthy	0	0	19	0.00	\N	{}	\N	2026-05-10 23:02:59.699808+00	2026-05-10 23:02:59.699808+00
C_MP0DP7JOY1FJ	KUDO_FUTURE	\N	\N	UC0z75Ny23tta7JsCa4XBbEg	Fringe On FOX	VN	Active	Pending	Healthy	0	0	18	0.00	\N	{}	\N	2026-05-10 23:02:59.700841+00	2026-05-10 23:02:59.700841+00
C_MP0DP7JP0CM8	KUDO_FUTURE	\N	\N	UC8NYnI2H0z9wLwSOQAEJP3g	Rr Aa	VN	Active	Pending	Healthy	0	0	18	0.00	\N	{}	\N	2026-05-10 23:02:59.701925+00	2026-05-10 23:02:59.701925+00
C_MP0DP7JRPP4Q	KUDO_FUTURE	\N	\N	UC0pTYXmMvlVEYk6GeHOW6xw	Mago	VN	Active	Monetized	Healthy	0	0	18	0.01	\N	{}	\N	2026-05-10 23:02:59.703086+00	2026-05-10 23:02:59.703086+00
C_MP0DP7JSQV2W	KUDO_FUTURE	\N	\N	UCL2fesF79FvPW2r1Zt0mcoQ	Mina Paper Dolls	VN	Active	Pending	Healthy	0	0	17	0.00	\N	{}	\N	2026-05-10 23:02:59.704222+00	2026-05-10 23:02:59.704222+00
C_MP0DP7JT9DLQ	KUDO_FUTURE	\N	\N	UCfeAn0u3A9dt5EHB1vwid7A	Cesar design pro (um criador do canal)	VN	Active	Pending	Healthy	0	0	17	0.00	\N	{}	\N	2026-05-10 23:02:59.705448+00	2026-05-10 23:02:59.705448+00
C_MP0DP7JUVXQI	KUDO_FUTURE	\N	\N	UCH_rRPEOMD93NkNxo5oZolQ	Laurel Leaves	VN	Active	Monetized	Healthy	0	0	17	0.00	\N	{}	\N	2026-05-10 23:02:59.706767+00	2026-05-10 23:02:59.706767+00
C_MP0DP7JV2X1X	KUDO_FUTURE	\N	\N	UCtMe4du_yvUS9FkR7nFQ5TQ	Tiagovski	VN	Active	Monetized	Healthy	0	0	16	0.01	\N	{}	\N	2026-05-10 23:02:59.707986+00	2026-05-10 23:02:59.707986+00
C_MP0DP7JXQOIV	KUDO_FUTURE	\N	\N	UCeHIb8lTrnfHa3_K0dN5-Og	Rdx Nizam Shorts	VN	Active	Pending	Healthy	0	0	16	0.00	\N	{}	\N	2026-05-10 23:02:59.709105+00	2026-05-10 23:02:59.709105+00
C_MP0DP7JY97OP	KUDO_FUTURE	\N	\N	UCtM0UXAAh2SSgY-SypAKbTw	Диян	VN	Active	Pending	Healthy	0	0	16	0.00	\N	{}	\N	2026-05-10 23:02:59.710146+00	2026-05-10 23:02:59.710146+00
C_MP0DP7JZP3P4	KUDO_FUTURE	\N	\N	UCCZjtwb550WUR48pKU330CA	Sehervakti	VN	Active	Pending	Healthy	0	0	16	0.00	\N	{}	\N	2026-05-10 23:02:59.7112+00	2026-05-10 23:02:59.7112+00
C_MP0DP7K0L49L	KUDO_FUTURE	\N	\N	UC3hfHIPnFVewdT3zU3-jemg	FATİH GENÇLİK	VN	Active	Pending	Healthy	0	0	15	0.00	\N	{}	\N	2026-05-10 23:02:59.712292+00	2026-05-10 23:02:59.712292+00
C_MP0DP7K194CO	KUDO_FUTURE	\N	\N	UCYm7Xt5emH_YHn3h7Bl87ew	Debora Rodrigues	VN	Active	Pending	Healthy	0	0	15	0.00	\N	{}	\N	2026-05-10 23:02:59.713309+00	2026-05-10 23:02:59.713309+00
C_MP0DP7K262I7	KUDO_FUTURE	\N	\N	UCdHnEMoSoR4qwY7eS_7zp-A	ADELE (regard)	VN	Active	Pending	Healthy	0	0	15	0.00	\N	{}	\N	2026-05-10 23:02:59.71433+00	2026-05-10 23:02:59.71433+00
C_MP0DP7K31P3C	KUDO_FUTURE	\N	\N	UCO-YGYnAcbPgKAyVzNQppfQ	Haji Harki	VN	Active	Monetized	Healthy	0	0	15	0.01	\N	{}	\N	2026-05-10 23:02:59.715391+00	2026-05-10 23:02:59.715391+00
C_MP0DP7K4ZNNE	KUDO_FUTURE	\N	\N	UCRvm8mg1tnhMVhzz7gHM3CA	shaziya. m	VN	Active	Pending	Healthy	0	0	15	0.00	\N	{}	\N	2026-05-10 23:02:59.716405+00	2026-05-10 23:02:59.716405+00
C_MP0DP7K5CXIJ	KUDO_FUTURE	\N	\N	UCXy52k-oAEodtChONj_E0cQ	ŞABAN BELADA	VN	Active	Monetized	Healthy	0	0	14	0.00	\N	{}	\N	2026-05-10 23:02:59.717745+00	2026-05-10 23:02:59.717745+00
C_MP0DP7K61Y6G	KUDO_FUTURE	\N	\N	UCWqldUwIopbdSK0h7YOf_VQ	Young Muslims	VN	Active	Monetized	Healthy	0	0	14	0.02	\N	{}	\N	2026-05-10 23:02:59.718801+00	2026-05-10 23:02:59.718801+00
C_MP0DP7K73V4Q	KUDO_FUTURE	\N	\N	UC-EZqrl84w_OE8OipPmZXSA	wrathi	VN	Active	Pending	Healthy	0	0	14	0.00	\N	{}	\N	2026-05-10 23:02:59.719858+00	2026-05-10 23:02:59.719858+00
C_MP0DP7K8EMI7	KUDO_FUTURE	\N	\N	UCgKDZJkBRq9qhPJBFNX2gEQ	Vine Türkiye	VN	Active	Monetized	Healthy	0	0	13	0.00	\N	{}	\N	2026-05-10 23:02:59.720932+00	2026-05-10 23:02:59.720932+00
C_MP0DP7K9SISN	KUDO_FUTURE	\N	\N	UCI1ynx7Bs2Gvhx9qgnJU2hw	lordofsilver	VN	Active	Pending	Healthy	0	0	13	0.00	\N	{}	\N	2026-05-10 23:02:59.721994+00	2026-05-10 23:02:59.721994+00
C_MP0DP7KAB2LE	KUDO_FUTURE	\N	\N	UC6UdGq5YAsOPalFLRSCG0UQ	Suffagah Çocuk	VN	Active	Monetized	Healthy	0	0	13	0.00	\N	{}	\N	2026-05-10 23:02:59.723055+00	2026-05-10 23:02:59.723055+00
C_MP0DP7KCK10J	KUDO_FUTURE	\N	\N	UCImhl8Qrd9qe3sRG9UrE4MA	Lorena e  Bidu🐕	VN	Active	Pending	Healthy	0	0	13	0.00	\N	{}	\N	2026-05-10 23:02:59.724119+00	2026-05-10 23:02:59.724119+00
C_MP0DP7KDE923	KUDO_FUTURE	\N	\N	UCGIABJo9pQg8kvxqsp2fcHA	DearSyria	VN	Active	Monetized	Healthy	0	0	12	0.00	\N	{}	\N	2026-05-10 23:02:59.725229+00	2026-05-10 23:02:59.725229+00
C_MP0DP7KEP56S	KUDO_FUTURE	\N	\N	UCg9aOcGTdzSRTf8bgBQFQiw	Fun river	VN	Active	Pending	Healthy	0	0	12	0.00	\N	{}	\N	2026-05-10 23:02:59.726266+00	2026-05-10 23:02:59.726266+00
C_MP0DP7KFV61H	KUDO_FUTURE	\N	\N	UClk6WvqdtoETuSYBmzHWPwg	Te amo eme Villalu	VN	Active	Pending	Healthy	0	0	12	0.00	\N	{}	\N	2026-05-10 23:02:59.727369+00	2026-05-10 23:02:59.727369+00
C_MP0DP7KGP0T4	KUDO_FUTURE	\N	\N	UCdfr6gVlV-1XSxRlb6wtr2w	hayalgücügeliştiren ödevler	VN	Active	Monetized	Healthy	0	0	12	0.00	\N	{}	\N	2026-05-10 23:02:59.728399+00	2026-05-10 23:02:59.728399+00
C_MP0DP7KH8EZY	KUDO_FUTURE	\N	\N	UC4Wsk2m4WFQVTLhVbqSCZaA	Sohn von Klaus	VN	Active	Monetized	Healthy	0	0	12	0.00	\N	{}	\N	2026-05-10 23:02:59.729503+00	2026-05-10 23:02:59.729503+00
C_MP0DP7KIGT84	KUDO_FUTURE	\N	\N	UC2BdhpyHKRs9vLeuogWQ6mw	OmanTvGeneral	VN	Active	Pending	Healthy	0	0	12	0.00	\N	{}	\N	2026-05-10 23:02:59.730523+00	2026-05-10 23:02:59.730523+00
C_MP0DP7KJDJM9	KUDO_FUTURE	\N	\N	UCjyk7PsKsu6Fu18JsWXcUzw	Фирамир	VN	Active	Pending	Healthy	0	0	12	0.00	\N	{}	\N	2026-05-10 23:02:59.731581+00	2026-05-10 23:02:59.731581+00
C_MP0DP7KK9OAX	KUDO_FUTURE	\N	\N	UCv5QErn43pwyHIYls7rmMtw	DescomplicIA	VN	Active	Pending	Healthy	0	0	12	0.00	\N	{}	\N	2026-05-10 23:02:59.732586+00	2026-05-10 23:02:59.732586+00
C_MP0DP7KL5Z1E	KUDO_FUTURE	\N	\N	UCTrvn7m3dMC0iAvv3WJRliQ	operatwins	VN	Active	Pending	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.733594+00	2026-05-10 23:02:59.733594+00
C_MP0DP7KMV7X5	KUDO_FUTURE	\N	\N	UCetyWER3Lh9xSvdzI1MHt3w	Samarqandiy	VN	Active	Monetized	Healthy	0	0	11	0.01	\N	{}	\N	2026-05-10 23:02:59.734646+00	2026-05-10 23:02:59.734646+00
C_MP0DP7KNW8N4	KUDO_FUTURE	\N	\N	UCMkvSq471yzbUHcrDqKuS6A	Spider Pigg	VN	Active	Pending	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.735743+00	2026-05-10 23:02:59.735743+00
C_MP0DP7KOVUFJ	KUDO_FUTURE	\N	\N	UCpDAfwq8rpW9kOuZkunit8g	Love Toys	VN	Active	Pending	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.736771+00	2026-05-10 23:02:59.736771+00
C_MP0DP7KPY7L0	KUDO_FUTURE	\N	\N	UCfkr2Wq2btTOF9pUGbBBlRg	Jaime Navarro Jr	VN	Active	Pending	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.737773+00	2026-05-10 23:02:59.737773+00
C_MP0DP7KQWFYM	KUDO_FUTURE	\N	\N	UCJbSaRjB2Fqt7mW124lr4ug	Hasnain	VN	Active	Pending	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.738791+00	2026-05-10 23:02:59.738791+00
C_MP0DP7KR4060	KUDO_FUTURE	\N	\N	UC2yhlaBNh-SUfKA5nRYnGHA	sıradan biri	VN	Active	Monetized	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.739835+00	2026-05-10 23:02:59.739835+00
C_MP0DP7KSRS03	KUDO_FUTURE	\N	\N	UC352KFL7j8qg0FS5YBgK_Ww	Varenyam Mhatre	VN	Active	Pending	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.740908+00	2026-05-10 23:02:59.740908+00
C_MP0DP7KTXQGH	KUDO_FUTURE	\N	\N	UCwYkAuYoqRc2-pqscGQZ7yg	Ислам студио	VN	Active	Pending	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.741943+00	2026-05-10 23:02:59.741943+00
C_MP0DP7KUDX24	KUDO_FUTURE	\N	\N	UC-T1YWVoddiuGDiLfAs6HRw	Jay Walker	VN	Active	Pending	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.742985+00	2026-05-10 23:02:59.742985+00
C_MP0DP7KVBCO0	KUDO_FUTURE	\N	\N	UC_rxuUXQiZTxwXU3_Thpc_g	Samira Moradi	VN	Active	Pending	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.744004+00	2026-05-10 23:02:59.744004+00
C_MP0DP7KWT3WZ	KUDO_FUTURE	\N	\N	UClafxg_XRjaEdn3AKUAm0IA	ataricimemet	VN	Active	Monetized	Healthy	0	0	11	0.00	\N	{}	\N	2026-05-10 23:02:59.745011+00	2026-05-10 23:02:59.745011+00
C_MP0DP7KXMD13	KUDO_FUTURE	\N	\N	UCQVr6BsWaOO-SRqi5HmohJA	Gardenia Lima	VN	Active	Pending	Healthy	0	0	10	0.00	\N	{}	\N	2026-05-10 23:02:59.746022+00	2026-05-10 23:02:59.746022+00
C_MP0DP7KYLR1I	KUDO_FUTURE	\N	\N	UCRfAdOtt1MVmwx9QAeK9wiw	documentariesfootage	VN	Active	Monetized	Healthy	0	0	10	0.00	\N	{}	\N	2026-05-10 23:02:59.747044+00	2026-05-10 23:02:59.747044+00
C_MP0DP7L0AOQR	KUDO_FUTURE	\N	\N	UCnPjs4RsDDQizX3_nKICE_A	bodaicake & dotssoli & colipen & green channel	VN	Active	Pending	Healthy	0	0	10	0.00	\N	{}	\N	2026-05-10 23:02:59.748084+00	2026-05-10 23:02:59.748084+00
C_MP0DP7L1WTM3	KUDO_FUTURE	\N	\N	UC2LCj_lOdKzitZUol5TZ1Gg	Armut	VN	Active	Monetized	Healthy	0	0	10	0.00	\N	{}	\N	2026-05-10 23:02:59.749106+00	2026-05-10 23:02:59.749106+00
C_MP0DP7L2MTYP	KUDO_FUTURE	\N	\N	UCixbXE-FHI3fYueIjgJW5_w	RahmetForum	VN	Active	Pending	Healthy	0	0	10	0.00	\N	{}	\N	2026-05-10 23:02:59.750192+00	2026-05-10 23:02:59.750192+00
C_MP0DP7L3ZIIB	KUDO_FUTURE	\N	\N	UCYPd2WsfYXBWXjwrRJJ9QHw	Sam	VN	Active	Monetized	Healthy	0	0	10	0.00	\N	{}	\N	2026-05-10 23:02:59.751201+00	2026-05-10 23:02:59.751201+00
C_MP0DP7L4VPAC	KUDO_FUTURE	\N	\N	UCR-Un5crdasv7xfZ3BleV2w	May五月简单生活	VN	Active	Pending	Healthy	0	0	10	0.00	\N	{}	\N	2026-05-10 23:02:59.752271+00	2026-05-10 23:02:59.752271+00
C_MP0DP7L5WFWK	KUDO_FUTURE	\N	\N	UCE5Io_6uW2BEWTo-P8N5Cew	HUZUR İSLAMDA	VN	Active	Pending	Healthy	0	0	10	0.00	\N	{}	\N	2026-05-10 23:02:59.753309+00	2026-05-10 23:02:59.753309+00
C_MP0DP7L6MVXN	KUDO_FUTURE	\N	\N	UCxjk5WrmgxoA_LmSs7Rnd9w	rahat khan	VN	Active	Pending	Healthy	0	0	10	0.00	\N	{}	\N	2026-05-10 23:02:59.754444+00	2026-05-10 23:02:59.754444+00
C_MP0DP7L7HUK3	KUDO_FUTURE	\N	\N	UCkYrF7rTaW_BD1OEt8xW7zg	BT Bilgisayar	VN	Active	Pending	Healthy	0	0	9	0.00	\N	{}	\N	2026-05-10 23:02:59.755481+00	2026-05-10 23:02:59.755481+00
C_MP0DP7L8K9RR	KUDO_FUTURE	\N	\N	UCC6tng-rpjA3yaabHdhTVpg	Nara_yfey	VN	Active	Pending	Healthy	0	0	9	0.00	\N	{}	\N	2026-05-10 23:02:59.756558+00	2026-05-10 23:02:59.756558+00
C_MP0DP7L92TY1	KUDO_FUTURE	\N	\N	UCvbQPL5zU8vUkp5FaN-hzhA	Josias Mariano	VN	Active	Pending	Healthy	0	0	9	0.00	\N	{}	\N	2026-05-10 23:02:59.757651+00	2026-05-10 23:02:59.757651+00
C_MP0DP7LAWY8V	KUDO_FUTURE	\N	\N	UC_GPduEAHKBV7tARVqrtHqQ	Pedro henrique cortezia	VN	Active	Pending	Healthy	0	0	9	0.00	\N	{}	\N	2026-05-10 23:02:59.758697+00	2026-05-10 23:02:59.758697+00
C_MP0DP7LBH0RO	KUDO_FUTURE	\N	\N	UCfzTk_t0Ln9frUie8OeotWw	omar aljamra	VN	Active	Pending	Healthy	0	0	9	0.00	\N	{}	\N	2026-05-10 23:02:59.7597+00	2026-05-10 23:02:59.7597+00
C_MP0DP7LCZ9H2	KUDO_FUTURE	\N	\N	UCYXZ0SMzmI-ngNQNL2d03tw	HOMEHOPETWINS CHANNEL	VN	Active	Pending	Healthy	0	0	8	0.00	\N	{}	\N	2026-05-10 23:02:59.760716+00	2026-05-10 23:02:59.760716+00
C_MP0DP7LDI7K3	KUDO_FUTURE	\N	\N	UC3RAWgQW2cZLIMUG82wSw5g	המכון לחקר החלל והתעופה	VN	Active	Monetized	Healthy	0	0	8	0.00	\N	{}	\N	2026-05-10 23:02:59.761782+00	2026-05-10 23:02:59.761782+00
C_MP0DP7LEZM01	KUDO_FUTURE	\N	\N	UC097_IDkvA7O03yeS3WhCsQ	BİRCAN KEREM	VN	Active	Pending	Healthy	0	0	8	0.00	\N	{}	\N	2026-05-10 23:02:59.762793+00	2026-05-10 23:02:59.762793+00
C_MP0DP7LFKGB2	KUDO_FUTURE	\N	\N	UCOiHo5t7mJPpddFpogyE8Og	Ngo Ai Phuong	VN	Active	Pending	Healthy	0	0	8	0.00	\N	{}	\N	2026-05-10 23:02:59.763795+00	2026-05-10 23:02:59.763795+00
C_MP0DP7LGTJNX	KUDO_FUTURE	\N	\N	UCH08-WclOQ8gkyZnfweHTsg	Sussey baka	VN	Active	Pending	Healthy	0	0	8	0.00	\N	{}	\N	2026-05-10 23:02:59.7648+00	2026-05-10 23:02:59.7648+00
C_MP0DP7LH2MLL	KUDO_FUTURE	\N	\N	UCaJOn7sS3mVu_Sk7LuCx52Q	Maria Centeno	VN	Active	Pending	Healthy	0	0	8	0.00	\N	{}	\N	2026-05-10 23:02:59.765901+00	2026-05-10 23:02:59.765901+00
C_MP0DP7LIW44R	KUDO_FUTURE	\N	\N	UCC5bcKJtwF5Ay3_kQOoxZlA	Dani Santos	VN	Active	Pending	Healthy	0	0	8	0.00	\N	{}	\N	2026-05-10 23:02:59.766905+00	2026-05-10 23:02:59.766905+00
C_MP0DP7LJA35F	KUDO_FUTURE	\N	\N	UCPrjS7qZYg9vX_xP-T6bbNw	uygur islam	VN	Active	Pending	Healthy	0	0	8	0.00	\N	{}	\N	2026-05-10 23:02:59.767904+00	2026-05-10 23:02:59.767904+00
C_MP0DP7LKXHHW	KUDO_FUTURE	\N	\N	UCIbq34wCHPLVKK8VR5hLCsw	Vine Türkiye	VN	Active	Pending	Healthy	0	0	8	0.00	\N	{}	\N	2026-05-10 23:02:59.768906+00	2026-05-10 23:02:59.768906+00
C_MP0DP7LMUBE3	KUDO_FUTURE	\N	\N	UCwfbewzmh7XrJstNCsdckRg	Alemdar CizgiFilm	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.770188+00	2026-05-10 23:02:59.770188+00
C_MP0DP7LNF99H	KUDO_FUTURE	\N	\N	UC2McqcWQ8_Iz1W7VQYgzD8A	Aysenur Gurel	VN	Active	Monetized	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.771253+00	2026-05-10 23:02:59.771253+00
C_MP0DP7LO7GEL	KUDO_FUTURE	\N	\N	UCO5T3mM8NTsiRicoG9OEFXA	çoşkun şahin	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.772359+00	2026-05-10 23:02:59.772359+00
C_MP0DP7LPBEAI	KUDO_FUTURE	\N	\N	UCK-c9yLm9JLjwFTD15he6Kw	Perspexsion	VN	Active	Monetized	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.773417+00	2026-05-10 23:02:59.773417+00
C_MP0DP7LQFCSL	KUDO_FUTURE	\N	\N	UCQmw1moILVtrMreshtc7R2w	Nasir Khan	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.774465+00	2026-05-10 23:02:59.774465+00
C_MP0DP7LRWX24	KUDO_FUTURE	\N	\N	UC41vkRTMdDZHQWVogJkVe3g	Fatih TOPCU	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.775509+00	2026-05-10 23:02:59.775509+00
C_MP0DP7LSBG5P	KUDO_FUTURE	\N	\N	UC7WeR3SuOsjt8pW48aoQE-Q	BaBaBop Finnish	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.77655+00	2026-05-10 23:02:59.77655+00
C_MP0DP7LT2Y9H	KUDO_FUTURE	\N	\N	UC8t5kfndKW-eUOP3D_RoObg	Seyyid Ali îbn al-Hussein Al-Alâwî	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.777557+00	2026-05-10 23:02:59.777557+00
C_MP0DP7LU5IPL	KUDO_FUTURE	\N	\N	UCQRNrFmyfJHyLUiOhiFXG_Q	Mehmet köklü	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.778572+00	2026-05-10 23:02:59.778572+00
C_MP0DP7LVT6TD	KUDO_FUTURE	\N	\N	UCfPHcM-YW6uV3CFNOeNwvBQ	delicesevmek	VN	Active	Monetized	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.779626+00	2026-05-10 23:02:59.779626+00
C_MP0DP7LWLK4O	KUDO_FUTURE	\N	\N	UCZ78NTvhDPBsQY_AffoZ99Q	Said Madi	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.780658+00	2026-05-10 23:02:59.780658+00
C_MP0DP7LX4N65	KUDO_FUTURE	\N	\N	UCGRxskkmdEiB2t4aepS3emQ	interesting	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.781668+00	2026-05-10 23:02:59.781668+00
C_MP0DP7LYEAFK	KUDO_FUTURE	\N	\N	UC4vjb8KtKejBWeP-uzl-V8w	7bemyt	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.782739+00	2026-05-10 23:02:59.782739+00
C_MP0DP7LZAJKC	KUDO_FUTURE	\N	\N	UC4-4U5xpqstEgYEFPqUER2A	Fun@AbhinavYash 😃	VN	Active	Pending	Healthy	0	0	7	0.00	\N	{}	\N	2026-05-10 23:02:59.783806+00	2026-05-10 23:02:59.783806+00
C_MP0DP7M0KWJE	KUDO_FUTURE	\N	\N	UCMq1fF739loFEulHv_VQODQ	Naomi Sakamaki	VN	Active	Pending	Healthy	0	0	6	0.00	\N	{}	\N	2026-05-10 23:02:59.784823+00	2026-05-10 23:02:59.784823+00
C_MP0DP7M1ZGL7	KUDO_FUTURE	\N	\N	UCoyNCdTZ3YvCAh7O5t9xpQw	Aadivasi boy	VN	Active	Pending	Healthy	0	0	6	0.00	\N	{}	\N	2026-05-10 23:02:59.785839+00	2026-05-10 23:02:59.785839+00
C_MP0DP7M2T67M	KUDO_FUTURE	\N	\N	UC56VroaBR4VkhaTJoqbQjWA	ICNA	VN	Active	Monetized	Healthy	0	0	6	0.00	\N	{}	\N	2026-05-10 23:02:59.786846+00	2026-05-10 23:02:59.786846+00
C_MP0DP7M4Y9VO	KUDO_FUTURE	\N	\N	UCE_Iad74Ax3oDAHy46ewHSw	Mester kula	VN	Active	Pending	Healthy	0	0	6	0.00	\N	{}	\N	2026-05-10 23:02:59.788138+00	2026-05-10 23:02:59.788138+00
C_MP0DP7M5NJ0K	KUDO_FUTURE	\N	\N	UCwnKhC3aWlzH8LUkUEvwRUQ	Çocuklar Tv	VN	Active	Pending	Healthy	0	0	6	0.00	\N	{}	\N	2026-05-10 23:02:59.789191+00	2026-05-10 23:02:59.789191+00
C_MP0DP7M6UEMW	KUDO_FUTURE	\N	\N	UCGuXe-HH8K6NfcneuT4Jk6w	M J and E	VN	Active	Pending	Healthy	0	0	6	0.00	\N	{}	\N	2026-05-10 23:02:59.790216+00	2026-05-10 23:02:59.790216+00
C_MP0DP7M7F57D	KUDO_FUTURE	\N	\N	UCJcsD8Qwaw-h_BiOmO4E4ww	oxalando	VN	Active	Pending	Healthy	0	0	6	0.00	\N	{}	\N	2026-05-10 23:02:59.791279+00	2026-05-10 23:02:59.791279+00
C_MP0DP7M8XGL1	KUDO_FUTURE	\N	\N	UCj5rWCTYHEKN8NYoh7JwFPg	Veysel Aydiner	VN	Active	Monetized	Healthy	0	0	6	0.00	\N	{}	\N	2026-05-10 23:02:59.792323+00	2026-05-10 23:02:59.792323+00
C_MP0DP7M9O4X8	KUDO_FUTURE	\N	\N	UCToDtyIBiXkq297fjYdmbpA	Ingrid Velasquez	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.79338+00	2026-05-10 23:02:59.79338+00
C_MP0DP7MARQ73	KUDO_FUTURE	\N	\N	UC6sH0V9Ca2IXhZ2vz1xU59w	Risale Forum	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.79439+00	2026-05-10 23:02:59.79439+00
C_MP0DP7MBJM9G	KUDO_FUTURE	\N	\N	UCIkLH359fIHyNwkDP7i_YXA	Para Soyak	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.795419+00	2026-05-10 23:02:59.795419+00
C_MP0DP7MCIC8K	KUDO_FUTURE	\N	\N	UCJ4Egqf0uVRhk-WSIsFpqHQ	Zakiyah Karim	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.796438+00	2026-05-10 23:02:59.796438+00
C_MP0DP7MD8K1M	KUDO_FUTURE	\N	\N	UCe4s9LeGmR8daeR0-b-tTuA	Leakhena	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.797472+00	2026-05-10 23:02:59.797472+00
C_MP0DP7MEAPYV	KUDO_FUTURE	\N	\N	UCw80OYNehkYPGPTHudY13QQ	Uğur Yazicilar	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.798468+00	2026-05-10 23:02:59.798468+00
C_MP0DP7MFSMC2	KUDO_FUTURE	\N	\N	UCimeU9CFlNOgeWBCIUZA6JQ	Sanjiv Ray	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.799492+00	2026-05-10 23:02:59.799492+00
C_MP0DP7MGEAZT	KUDO_FUTURE	\N	\N	UCQbFO1To4tjtWtBcm-Z_WyQ	yakup fırat	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.800501+00	2026-05-10 23:02:59.800501+00
C_MP0DP7MHPJ5T	KUDO_FUTURE	\N	\N	UCTR67Nv1PWUhjRbKTVTsd5A	Naryelys Pacheco	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.801769+00	2026-05-10 23:02:59.801769+00
C_MP0DP7MIS8XQ	KUDO_FUTURE	\N	\N	UC6aYO5I29iYm-Ij0f9V6XYw	Hizmetcom	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.802795+00	2026-05-10 23:02:59.802795+00
C_MP0DP7MJD5VN	KUDO_FUTURE	\N	\N	UCnXcfphFiQwglRROOeSXcMQ	WINSLET JOON ADEZA	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.803902+00	2026-05-10 23:02:59.803902+00
C_MP0DP7MK42AL	KUDO_FUTURE	\N	\N	UCAUQy8S-buCz8gXryVXbJRg	Vine Türk	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.805006+00	2026-05-10 23:02:59.805006+00
C_MP0DP7MM1UZX	KUDO_FUTURE	\N	\N	UCs-ZCSjIClH2ftzR_4F7Ldg	Farhana	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.806104+00	2026-05-10 23:02:59.806104+00
C_MP0DP7MN3FE9	KUDO_FUTURE	\N	\N	UC-y0dD_41aD2R5-PReRXT5g	LOELTV	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.807211+00	2026-05-10 23:02:59.807211+00
C_MP0DP7MOWBYL	KUDO_FUTURE	\N	\N	UCoWxDGmLlg9beGiwGdRZOZw	Fun with Rudra	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.808293+00	2026-05-10 23:02:59.808293+00
C_MP0DP7MPKVSF	KUDO_FUTURE	\N	\N	UCsQnLeHN12GJtNqwtbQIATQ	Jhan John Juan	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.809314+00	2026-05-10 23:02:59.809314+00
C_MP0DP7MQ1OK3	KUDO_FUTURE	\N	\N	UCSE03V4dXSzGg9MMM8kSSzw	BaBaBop Chinese	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.810319+00	2026-05-10 23:02:59.810319+00
C_MP0DP7MR118O	KUDO_FUTURE	\N	\N	UClk79GPLp34WeToYExUWDHg	Valentina Gonçalves	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.811367+00	2026-05-10 23:02:59.811367+00
C_MP0DP7MS1NGB	KUDO_FUTURE	\N	\N	UC5pkfm2AFzVpAuZxtC5PA8A	cojeptv	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.812389+00	2026-05-10 23:02:59.812389+00
C_MP0DP7MT7KN1	KUDO_FUTURE	\N	\N	UCFrqyy-9iGP6EnLPMx3AFVQ	Ntwadumela	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.813402+00	2026-05-10 23:02:59.813402+00
C_MP0DP7MUS1NG	KUDO_FUTURE	\N	\N	UCcHqeJgEjy3EJTyiXANSp6g	ballacid	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.814414+00	2026-05-10 23:02:59.814414+00
C_MP0DP7MVHMVU	KUDO_FUTURE	\N	\N	UCoMeTV1WlQD5U6wr0HHGIiw	NibiruTheDeathstar	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.815444+00	2026-05-10 23:02:59.815444+00
C_MP0DP7MWLLFO	KUDO_FUTURE	\N	\N	UCzfoOXTqU2nFIPjyG_UiGQQ	GamerX	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.816452+00	2026-05-10 23:02:59.816452+00
C_MP0DP7MXDQ6B	KUDO_FUTURE	\N	\N	UCMEHG6RbDcwk99EqEpsEFLA	bloody_bunny	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.817705+00	2026-05-10 23:02:59.817705+00
C_MP0DP7MY620E	KUDO_FUTURE	\N	\N	UChGnD2RpEJUWB56vWZT9s6Q	Les sisters <Nour&Nada>	VN	Active	Pending	Healthy	0	0	5	0.00	\N	{}	\N	2026-05-10 23:02:59.818934+00	2026-05-10 23:02:59.818934+00
C_MP0DP7N0ACRC	KUDO_FUTURE	\N	\N	UCtBeqa3MpIRo4SgrbkjKp2g	Patrice Strong	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.820144+00	2026-05-10 23:02:59.820144+00
C_MP0DP7N1RDP5	KUDO_FUTURE	\N	\N	UCEGDDloz9hx4AKmiGAch7Xw	F.A.I.R ™	VN	Active	Monetized	Healthy	0	0	4	0.01	\N	{}	\N	2026-05-10 23:02:59.821239+00	2026-05-10 23:02:59.821239+00
C_MP0DP7N2X6VD	KUDO_FUTURE	\N	\N	UCU_DZrGA9o7sK5fSoVfzSAw	yaşar akşam	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.822264+00	2026-05-10 23:02:59.822264+00
C_MP0DP7N3BYO2	KUDO_FUTURE	\N	\N	UCPlFyZYbmkGelTtjHY5xXMg	Soner Can	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.823282+00	2026-05-10 23:02:59.823282+00
C_MP0DP7N4XG50	KUDO_FUTURE	\N	\N	UCuu7gyCEb3pWWKXd40a8QLw	Tina DIY ESP	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.824353+00	2026-05-10 23:02:59.824353+00
C_MP0DP7N5HC6V	KUDO_FUTURE	\N	\N	UC68sXhVjyta08oz1sj5pxlQ	La o cafea, despre actualitatea actorilor turci	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.825361+00	2026-05-10 23:02:59.825361+00
C_MP0DP7N6PVGD	KUDO_FUTURE	\N	\N	UC5w8eu4fLFuLtNdCxiH1VcA	Lennon Pereira	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.826363+00	2026-05-10 23:02:59.826363+00
C_MP0DP7N735SS	KUDO_FUTURE	\N	\N	UC8V9UXpcPd14AsZeNBRqJ7w	Tarim Turk	VN	Active	Monetized	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.827388+00	2026-05-10 23:02:59.827388+00
C_MP0DP7N8XV63	KUDO_FUTURE	\N	\N	UCw6423_h9kpH-j35MTJNXag	Relatable panda	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.828432+00	2026-05-10 23:02:59.828432+00
C_MP0DP7N9UQCG	KUDO_FUTURE	\N	\N	UCW0N9oZBOeOQolRVZr4yQZw	Clifford Villarin	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.829438+00	2026-05-10 23:02:59.829438+00
C_MP0DP7NAHB07	KUDO_FUTURE	\N	\N	UCAMjiM4-q80SB7Zqn8yT0wQ	souleymane BA	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.830506+00	2026-05-10 23:02:59.830506+00
C_MP0DP7NBMS9T	KUDO_FUTURE	\N	\N	UCXYv2PqZUZsRvq0ThCXwvEQ	SNOCK_GAMER244	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.831605+00	2026-05-10 23:02:59.831605+00
C_MP0DP7NCH3A0	KUDO_FUTURE	\N	\N	UCPLb9EbUJwA4xGiMOlL9x3Q	Gelibolu Gezi Rehberi	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.832687+00	2026-05-10 23:02:59.832687+00
C_MP0DP7ND6EJA	KUDO_FUTURE	\N	\N	UCA8pQhQDxGTSBhof5o_aUnQ	Terrance Jones	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.833726+00	2026-05-10 23:02:59.833726+00
C_MP0DP7NEN5WF	KUDO_FUTURE	\N	\N	UCqXaClB2d3GYxZAca3F54Xg	Hikaye Zamanı	VN	Active	Monetized	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.834779+00	2026-05-10 23:02:59.834779+00
C_MP0DP7NFAQHM	KUDO_FUTURE	\N	\N	UCgZSIojV3PsNBJR7Ey_6eVA	Mariusika Asu	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.835801+00	2026-05-10 23:02:59.835801+00
C_MP0DP7NG14Q1	KUDO_FUTURE	\N	\N	UCGJ-jaWOlFQ_OCYLLUcWH5g	hisham elnmr	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.836819+00	2026-05-10 23:02:59.836819+00
C_MP0DP7NHHUHN	KUDO_FUTURE	\N	\N	UCIa8EgOuJXeOpZdLoOp8P-g	María Bogado país cositas	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.837826+00	2026-05-10 23:02:59.837826+00
C_MP0DP7NITCLU	KUDO_FUTURE	\N	\N	UCmiT1reKSmm4U9gp9iBOZ2A	SPL Cartoon	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.838829+00	2026-05-10 23:02:59.838829+00
C_MP0DP7NJRE3N	KUDO_FUTURE	\N	\N	UCKDPV1HVfMEEiM6tsI40xBA	Video Evi	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.839839+00	2026-05-10 23:02:59.839839+00
C_MP0DP7NK7NIP	KUDO_FUTURE	\N	\N	UCTuvd8GblXI-DF3e6WAu3kg	medine güneşi ilahiler	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.840849+00	2026-05-10 23:02:59.840849+00
C_MP0DP7NL4LMK	KUDO_FUTURE	\N	\N	UCRfr74K_PfBcbE8gFKZnSwQ	Jakyla Tuggle	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.841864+00	2026-05-10 23:02:59.841864+00
C_MP0DP7NM92SZ	KUDO_FUTURE	\N	\N	UC4Jw_VpdqWElRuv13lsyBfA	NAMAZ HAQQINDA	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.842862+00	2026-05-10 23:02:59.842862+00
C_MP0DP7NOPDEF	KUDO_FUTURE	\N	\N	UCDJSowNG1Ny3qOi69ZIS6JA	Mundo da JAJA	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.844191+00	2026-05-10 23:02:59.844191+00
C_MP0DP7NPBS6A	KUDO_FUTURE	\N	\N	UCEHRbZiVq9xiyqk_xEpKTig	Aldawleiah Alasasya Medical	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.845207+00	2026-05-10 23:02:59.845207+00
C_MP0DP7NQEPPY	KUDO_FUTURE	\N	\N	UCdiEyJ1iGWgbuJg49_k51HQ	Trai Phan	VN	Active	Pending	Healthy	0	0	4	0.00	\N	{}	\N	2026-05-10 23:02:59.846209+00	2026-05-10 23:02:59.846209+00
C_MP0DP7NRH9Y9	KUDO_FUTURE	\N	\N	UCiNFxAYT9rluI0QU2VMZ2Eg	Thiaguinho-Games-Videos	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.847222+00	2026-05-10 23:02:59.847222+00
C_MP0DP7NSZP1X	KUDO_FUTURE	\N	\N	UCN4SQUQdF7voGWc4NCi1FAA	YUSUF TAŞ	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.848359+00	2026-05-10 23:02:59.848359+00
C_MP0DP7NTDMA5	KUDO_FUTURE	\N	\N	UCcXJtiFfAUK5n0Ds8rns4YA	marmarali81	VN	Active	Monetized	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.849483+00	2026-05-10 23:02:59.849483+00
C_MP0DP7NUORH6	KUDO_FUTURE	\N	\N	UC6J7I4-8p1_4PoZMrvQpfxg	World People 2050	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.850696+00	2026-05-10 23:02:59.850696+00
C_MP0DP7NVZ6YL	KUDO_FUTURE	\N	\N	UC_FLpDG7LTgpdBxwEsw9PUg	Croce Rossa Italiana Nova Milanese	VN	Active	Monetized	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.851823+00	2026-05-10 23:02:59.851823+00
C_MP0DP7NWRHV5	KUDO_FUTURE	\N	\N	UC2DJwCT05RqhDExG9j4EejQ	Living Hebrews	VN	Active	Monetized	Healthy	0	0	3	0.01	\N	{}	\N	2026-05-10 23:02:59.852906+00	2026-05-10 23:02:59.852906+00
C_MP0DP7NXWCTI	KUDO_FUTURE	\N	\N	UCxxuHCVNEhQpmnHhIesTfRg	kaiser	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.853954+00	2026-05-10 23:02:59.853954+00
C_MP0DP7NYOJP8	KUDO_FUTURE	\N	\N	UCX3re9yCalfyBvk2bcJhzLA	Genevieve Rodgers	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.855043+00	2026-05-10 23:02:59.855043+00
C_MP0DP7O0SW9E	KUDO_FUTURE	\N	\N	UCn-Nvz5TzfAMm1hNsrd3Owg	My name is Muhammad Ali	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.856162+00	2026-05-10 23:02:59.856162+00
C_MP0DP7O1864H	KUDO_FUTURE	\N	\N	UC9q2xJDtjH8myCoom9pW9tw	Hector alexis Zeledon medina	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.857183+00	2026-05-10 23:02:59.857183+00
C_MP0DP7O22OC4	KUDO_FUTURE	\N	\N	UCtW1py1VjSfsYaYvZG2V-gQ	James Cardozo Ramos	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.858194+00	2026-05-10 23:02:59.858194+00
C_MP0DP7O3K7YF	KUDO_FUTURE	\N	\N	UCUg8qnNWKjcGy1JZzSgAKRg	nursisaid	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.859219+00	2026-05-10 23:02:59.859219+00
C_MP0DP7O4JUOV	KUDO_FUTURE	\N	\N	UCL8bHsyeH5rdXMFpYNItaZg	Foziljon IKROMOV	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.86032+00	2026-05-10 23:02:59.86032+00
C_MP0DP7O5VKIC	KUDO_FUTURE	\N	\N	UCi1Dy2esSVzqfAg2G-avCkA	The 45 channel	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.861361+00	2026-05-10 23:02:59.861361+00
C_MP0DP7O6KGHJ	KUDO_FUTURE	\N	\N	UC3Fua5_yZiqC613VemMvK9Q	Fernando Fernández	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.862361+00	2026-05-10 23:02:59.862361+00
C_MP0DP7O7H9BW	KUDO_FUTURE	\N	\N	UCcTiv6-KOPbVn3jTXgdcDLw	belgeselzamani	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.863425+00	2026-05-10 23:02:59.863425+00
C_MP0DP7O8JL8M	KUDO_FUTURE	\N	\N	UC03knmxXnG8-rlxcrPI4Wqw	Mukesh	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.864505+00	2026-05-10 23:02:59.864505+00
C_MP0DP7O9PFNR	KUDO_FUTURE	\N	\N	UC3e24gx9StzL2Juhs1yKKkg	Niko	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.865576+00	2026-05-10 23:02:59.865576+00
C_MP0DP7OAX98C	KUDO_FUTURE	\N	\N	UCVO2H35GiqOmRO7kIOjKjgg	Gatoo136	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.866628+00	2026-05-10 23:02:59.866628+00
C_MP0DP7OB0398	KUDO_FUTURE	\N	\N	UCEHIaui6a-HfelLiYxZI-2g	elhasil	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.867777+00	2026-05-10 23:02:59.867777+00
C_MP0DP7OCT2FS	KUDO_FUTURE	\N	\N	UC3RYCSLdhA7i-WyGFyYsUbw	^• hey_moras•^	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.868894+00	2026-05-10 23:02:59.868894+00
C_MP0DP7ODJ8RS	KUDO_FUTURE	\N	\N	UCff_0bNrrpyHFc725aS0e4A	ToT	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.869933+00	2026-05-10 23:02:59.869933+00
C_MP0DP7OEBARO	KUDO_FUTURE	\N	\N	UCvlJ9YkVLwPYonERlW4--Rg	Denis Arroyo	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.870943+00	2026-05-10 23:02:59.870943+00
C_MP0DP7OFGGNX	KUDO_FUTURE	\N	\N	UCA3CpI7lJzuAigT2EVVKJVw	Tekno Cin	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.871963+00	2026-05-10 23:02:59.871963+00
C_MP0DP7OGSLB4	KUDO_FUTURE	\N	\N	UC1E7K14W26aC4dxg4PUk2jg	ak02-tv	VN	Active	Monetized	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.872979+00	2026-05-10 23:02:59.872979+00
C_MP0DP7OHXWXK	KUDO_FUTURE	\N	\N	UC13DXiM8ecLT7GCv1rOXyOQ	Tala Issa 🥀	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.873997+00	2026-05-10 23:02:59.873997+00
C_MP0DP7OI9SAC	KUDO_FUTURE	\N	\N	UCreO0WJfQKDjSqD0-jPaeuQ	OrdaN BurdaN	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.874997+00	2026-05-10 23:02:59.874997+00
C_MP0DP7OJRDGS	KUDO_FUTURE	\N	\N	UCe5vjomy-kFYYZzjxbIDd7Q	Francine Francis	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.876029+00	2026-05-10 23:02:59.876029+00
C_MP0DP7OKCWUB	KUDO_FUTURE	\N	\N	UCRc54AlG_eZHc2ocNYwx28w	MEMES FUN	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.877042+00	2026-05-10 23:02:59.877042+00
C_MP0DP7OMK183	KUDO_FUTURE	\N	\N	UC2G12pcbGTR8dYHFMq64J2A	ศิวพงษ์ คล่องพานิช	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.878069+00	2026-05-10 23:02:59.878069+00
C_MP0DP7ON26CU	KUDO_FUTURE	\N	\N	UCdS4vmbbAQC8WeT34oWFnLg	did the same thing	VN	Active	Pending	Healthy	0	0	3	0.00	\N	{}	\N	2026-05-10 23:02:59.879078+00	2026-05-10 23:02:59.879078+00
C_MP0DP7OOGTMD	KUDO_FUTURE	\N	\N	UCGtqQ1HRa_ar_ZurBYqlhwA	iLAHi DiYARI	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.8801+00	2026-05-10 23:02:59.8801+00
C_MP0DP7OPBZ79	KUDO_FUTURE	\N	\N	UC81mfeujjxt105Q5ScREH5w	Vineoloji	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.881112+00	2026-05-10 23:02:59.881112+00
C_MP0DP7OQTTAB	KUDO_FUTURE	\N	\N	UC-xUReXRGgSaAaltfRKZ-BQ	ibrahima babou	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.882273+00	2026-05-10 23:02:59.882273+00
C_MP0DP7ORR3E8	KUDO_FUTURE	\N	\N	UCXhe-TuL-31ypmpidoYoYIA	Isaac Melo	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.883338+00	2026-05-10 23:02:59.883338+00
C_MP0DP7OSUCBF	KUDO_FUTURE	\N	\N	UC1P2zThCY3n_UTCLlbx7J-A	Patricia Lopes Oliveira	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.884367+00	2026-05-10 23:02:59.884367+00
C_MP0DP7OT8POB	KUDO_FUTURE	\N	\N	UCU45UYBH1XiSNuhNL_CICiA	RAZEL CLARICE BARRERA	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.88537+00	2026-05-10 23:02:59.88537+00
C_MP0DP7OUAG5W	KUDO_FUTURE	\N	\N	UCe8aOmW2sbgJzcKcD9STjog	Julia Villa	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.886432+00	2026-05-10 23:02:59.886432+00
C_MP0DP7OVK0BP	KUDO_FUTURE	\N	\N	UCPNuXtN_YpyH53o0W10kXVg	serkan tatar	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.887566+00	2026-05-10 23:02:59.887566+00
C_MP0DP7OW3W4A	KUDO_FUTURE	\N	\N	UCqs7h-9jI2280jJb_x20XLA	Mustafa Güzel	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.888723+00	2026-05-10 23:02:59.888723+00
C_MP0DP7OXP4TE	KUDO_FUTURE	\N	\N	UCfeU56kOei2xM997OSmflKg	Güven kılıç	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.889851+00	2026-05-10 23:02:59.889851+00
C_MP0DP7OZ2YS3	KUDO_FUTURE	\N	\N	UCRBG9lEKSiqWFWPSZ8E1wuw	md tamim 200	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.891339+00	2026-05-10 23:02:59.891339+00
C_MP0DP7P0RRBT	KUDO_FUTURE	\N	\N	UCjLqWaqQOQEa7h4fvacTl4w	bvalltu	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.892527+00	2026-05-10 23:02:59.892527+00
C_MP0DP7P13O1V	KUDO_FUTURE	\N	\N	UCQ_XrnohA-yso11uOogdkiw	Mardinmen	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.893547+00	2026-05-10 23:02:59.893547+00
C_MP0DP7P21LKE	KUDO_FUTURE	\N	\N	UC6HmX5PcOk7xk5S4clbQWCQ	fabio xud	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.894556+00	2026-05-10 23:02:59.894556+00
C_MP0DP7P3TV48	KUDO_FUTURE	\N	\N	UC2np-jrXQF9-yu5B6U4wVIg	Teknolog Tekno	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.895626+00	2026-05-10 23:02:59.895626+00
C_MP0DP7P4UR96	KUDO_FUTURE	\N	\N	UCUEb68PrFUanaIQAkcAkqlg	cartoon play	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.896669+00	2026-05-10 23:02:59.896669+00
C_MP0DP7P5JMFP	KUDO_FUTURE	\N	\N	UCAV0w_TQeVCThUosgcMI9OA	DUNG NGUYỄN	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.897761+00	2026-05-10 23:02:59.897761+00
C_MP0DP7P6C822	KUDO_FUTURE	\N	\N	UC_KJrWjtPGVGCI2wONAwdVg	Korennaya_Bakinka	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.898843+00	2026-05-10 23:02:59.898843+00
C_MP0DP7P76ULL	KUDO_FUTURE	\N	\N	UCSLjzVgfJrOXncVmpij9FMQ	Direct Action 2026	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.899862+00	2026-05-10 23:02:59.899862+00
C_MP0DP7P821PO	KUDO_FUTURE	\N	\N	UCkBDa3jO_ops6aPJznMVtJg	ibrahim kasimoglu	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.900881+00	2026-05-10 23:02:59.900881+00
C_MP0DP7P9LUWT	KUDO_FUTURE	\N	\N	UCh-u4Au_jvLXwlBTxaNi3dg	Enes Batur	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.902043+00	2026-05-10 23:02:59.902043+00
C_MP0DP7PBQ8S7	KUDO_FUTURE	\N	\N	UCBqOjfVp2_QjI2sgrhRoAug	Nihat Hatipoğlu	VN	Active	Monetized	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.903091+00	2026-05-10 23:02:59.903091+00
C_MP0DP7PCI103	KUDO_FUTURE	\N	\N	UC7H-1FcBIqM2vMM-4cZiFRw	Kiel	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.904187+00	2026-05-10 23:02:59.904187+00
C_MP0DP7PDJX7U	KUDO_FUTURE	\N	\N	UCyYkLUYzVIj2FSwDzMc-wEg	Emel Candan	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.905208+00	2026-05-10 23:02:59.905208+00
C_MP0DP7PESQRR	KUDO_FUTURE	\N	\N	UCjDI5zrFXxkyTa5nf1xY3tw	AMPARO 💜💜	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.906217+00	2026-05-10 23:02:59.906217+00
C_MP0DP7PFLF40	KUDO_FUTURE	\N	\N	UCaU07JIZmWevOOytNmMvK0g	UZAY HABER	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.907214+00	2026-05-10 23:02:59.907214+00
C_MP0DP7PG4IDN	KUDO_FUTURE	\N	\N	UCHkc8t5kXGNH9KMB7D2y6jw	FBE DKAB	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.908259+00	2026-05-10 23:02:59.908259+00
C_MP0DP7PHC5XF	KUDO_FUTURE	\N	\N	UCBcWYDV5blnTDkBCPMrxw8A	Yeimy Delacruz	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.909252+00	2026-05-10 23:02:59.909252+00
C_MP0DP7PIBUTO	KUDO_FUTURE	\N	\N	UCg1xtXJsuLP6FW0gamd4L1Q	미래의 탐험가...	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.910346+00	2026-05-10 23:02:59.910346+00
C_MP0DP7PJHZGX	KUDO_FUTURE	\N	\N	UCeAklNC_8u60J4C0dGnD0YQ	Ruby G	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.911488+00	2026-05-10 23:02:59.911488+00
C_MP0DP7PK1EST	KUDO_FUTURE	\N	\N	UCtpx7AYbEnL1oSrkZdc7SqQ	Phong HD	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.912608+00	2026-05-10 23:02:59.912608+00
C_MP0DP7PLJKIM	KUDO_FUTURE	\N	\N	UCSBrcj1nwM5n8W9iUS7eBww	chezxXbjk	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.913782+00	2026-05-10 23:02:59.913782+00
C_MP0DP7PMJXBW	KUDO_FUTURE	\N	\N	UCLw-fIqrOu7tJGIUkhJoVQQ	Sinemaskop	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.914857+00	2026-05-10 23:02:59.914857+00
C_MP0DP7PNNT5N	KUDO_FUTURE	\N	\N	UC3DGFHvhuWma-AX_REGi47Q	SpaceWithSamNeill	VN	Active	Monetized	Healthy	0	0	2	0.01	\N	{}	\N	2026-05-10 23:02:59.916032+00	2026-05-10 23:02:59.916032+00
C_MP0DP7PPC6M7	KUDO_FUTURE	\N	\N	UCknxsbJHWHMnKSyfkCpvE_A	Jyky Salamatov	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.917105+00	2026-05-10 23:02:59.917105+00
C_MP0DP7PQ5S35	KUDO_FUTURE	\N	\N	UCwQomhwIB3d3tuSOgZjcFkQ	saanetershuffle	VN	Active	Monetized	Healthy	0	0	2	0.01	\N	{}	\N	2026-05-10 23:02:59.918118+00	2026-05-10 23:02:59.918118+00
C_MP0DP7PRUZJ2	KUDO_FUTURE	\N	\N	UCZWm16Xdhd6vDF-1ExGkgDg	Sensei Aziado	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.919115+00	2026-05-10 23:02:59.919115+00
C_MP0DP7PSZYID	KUDO_FUTURE	\N	\N	UC2IK7jCm06BJWnnP9IFm87A	Voices Of Black YouTube 2	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.92014+00	2026-05-10 23:02:59.92014+00
C_MP0DP7PTHF9U	KUDO_FUTURE	\N	\N	UCVhCm3L-J81FW_vOISyKu4A	ArabianGirrl	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.921144+00	2026-05-10 23:02:59.921144+00
C_MP0DP7PUGRAX	KUDO_FUTURE	\N	\N	UCNTgxh3MEQRpakx45oXBOnA	edwidth	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.922134+00	2026-05-10 23:02:59.922134+00
C_MP0DP7PV68VB	KUDO_FUTURE	\N	\N	UCp0urtN31TAFPkQJkg77-zg	TH-HFC	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.923119+00	2026-05-10 23:02:59.923119+00
C_MP0DP7PWSTRL	KUDO_FUTURE	\N	\N	UColZvrkQNDIOKYpfAxnLsBA	Ольга Анищенко	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.924117+00	2026-05-10 23:02:59.924117+00
C_MP0DP7PXBELS	KUDO_FUTURE	\N	\N	UCWCZgqncBTQcFqKlRgCIdgA	ᵐʸᵐᵉˡᵒᵈʸˡᵘᵛᶻˢᵒᵖʰᶦᵃ~!! ///>w<\\\\\\ 🩷	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.925105+00	2026-05-10 23:02:59.925105+00
C_MP0DP7PYGYP4	KUDO_FUTURE	\N	\N	UCHLWPlYvNXKP2h6IzojQ1Sw	T.C.Batur	VN	Active	Monetized	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.926115+00	2026-05-10 23:02:59.926115+00
C_MP0DP7PZTCRG	KUDO_FUTURE	\N	\N	UCb1n2nqVZiVqWt2_C8wSxSw	DAVID ANDREWS sprunki	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.927132+00	2026-05-10 23:02:59.927132+00
C_MP0DP7Q0N8MU	KUDO_FUTURE	\N	\N	UC0IoeyiEaGTEYew3cVht4UA	bilal özbek	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.928268+00	2026-05-10 23:02:59.928268+00
C_MP0DP7Q1HNB0	KUDO_FUTURE	\N	\N	UCKVlA8yFEhs6eUOGp9Y0GZQ	ihsan akyıldız	VN	Active	Pending	Healthy	0	0	2	0.00	\N	{}	\N	2026-05-10 23:02:59.929375+00	2026-05-10 23:02:59.929375+00
C_MP0DP7Q2KEYR	KUDO_FUTURE	\N	\N	UCuCLT9zJmC0o9rTctSwrLHg	MovieBrox	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.930396+00	2026-05-10 23:02:59.930396+00
C_MP0DP7Q35QKL	KUDO_FUTURE	\N	\N	UC_cQrydXWfOBEPDtsN9QAWQ	Big Green screen channel	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.931421+00	2026-05-10 23:02:59.931421+00
C_MP0DP7Q4CPQ3	KUDO_FUTURE	\N	\N	UCuSfy2MMWdnmgrLpsoFA92A	HANA DOLLS	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.932426+00	2026-05-10 23:02:59.932426+00
C_MP0DP7Q52R47	KUDO_FUTURE	\N	\N	UCTuypa3w1QuJGg6xaKY1yXw	Juda Löwe	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.933434+00	2026-05-10 23:02:59.933434+00
C_MP0DP7Q6M0NK	KUDO_FUTURE	\N	\N	UCClo4xrW4pwNqmDnX-JRaGg	251omega	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.934427+00	2026-05-10 23:02:59.934427+00
C_MP0DP7Q7IWAW	KUDO_FUTURE	\N	\N	UCdoFIeyxBbvTYyAulMSx8nA	JK & KJ channel	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.935452+00	2026-05-10 23:02:59.935452+00
C_MP0DP7Q8IW18	KUDO_FUTURE	\N	\N	UCexJXIJlLyYeV_ve_LxGALw	dog man is go	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.936451+00	2026-05-10 23:02:59.936451+00
C_MP0DP7Q9TSSK	KUDO_FUTURE	\N	\N	UCo6aGsdUz3LNhvZkB2jjfHQ	Golden Freddy	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.937444+00	2026-05-10 23:02:59.937444+00
C_MP0DP7QAOZSX	KUDO_FUTURE	\N	\N	UCBpZ7_nIR-REwJ1c3tVyHFw	Dizi TV TR	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.938673+00	2026-05-10 23:02:59.938673+00
C_MP0DP7QBJH2R	KUDO_FUTURE	\N	\N	UCI2xOL1Oo9VfolOzC4rcYlA	Emerythegreat17	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.939706+00	2026-05-10 23:02:59.939706+00
C_MP0DP7QCIVW3	KUDO_FUTURE	\N	\N	UC1MgzzVkyD-NL8vukBv8YAw	घड़ी वाला ⌚	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.940708+00	2026-05-10 23:02:59.940708+00
C_MP0DP7QDXEL3	KUDO_FUTURE	\N	\N	UCD_yZWOTTTQx707RC4hw0Ug	James Bisset	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.941707+00	2026-05-10 23:02:59.941707+00
C_MP0DP7QELGC9	KUDO_FUTURE	\N	\N	UCrkyWYyEHzyUvm0JzKEnf-Q	jubaleeproductions	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.942697+00	2026-05-10 23:02:59.942697+00
C_MP0DP7QF870Y	KUDO_FUTURE	\N	\N	UCQQk5aJWV6gs1ATPpjQeRKg	SER FILM	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.944039+00	2026-05-10 23:02:59.944039+00
C_MP0DP7QHMZQ3	KUDO_FUTURE	\N	\N	UC8BPSFIDrv0DkwWChT6IrGA	Flixins	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.945111+00	2026-05-10 23:02:59.945111+00
C_MP0DP7QI3KS9	KUDO_FUTURE	\N	\N	UCijEXrSy1ddpxsJmHh-JzoA	Kadir Aslan	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.946236+00	2026-05-10 23:02:59.946236+00
C_MP0DP7QJWBUQ	KUDO_FUTURE	\N	\N	UCIYlkKdKHnSrYZqlYoM008g	TheStringadelic	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.947256+00	2026-05-10 23:02:59.947256+00
C_MP0DP7QK124P	KUDO_FUTURE	\N	\N	UCfd04k8G90BUKpz4-1jvagw	Sincere Jaden	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.948289+00	2026-05-10 23:02:59.948289+00
C_MP0DP7QLMHLK	KUDO_FUTURE	\N	\N	UCtFCZBO4q8i-ViAcre0ICZg	Video Video	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.949284+00	2026-05-10 23:02:59.949284+00
C_MP0DP7QMR7FH	KUDO_FUTURE	\N	\N	UCFyQ8JEElInmgIFjAYjDbVQ	titan tv woman vn	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.950298+00	2026-05-10 23:02:59.950298+00
C_MP0DP7QN7H5T	KUDO_FUTURE	\N	\N	UC7uEmQ6_gkQECLc78tw70xA	Keneth Jimènez	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.951318+00	2026-05-10 23:02:59.951318+00
C_MP0DP7QO1P95	KUDO_FUTURE	\N	\N	UC7_nslF2UWoT-UCtNcL5N4Q	Aman Chaita	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.95244+00	2026-05-10 23:02:59.95244+00
C_MP0DP7QPCIXU	KUDO_FUTURE	\N	\N	UCfT5h-l3KKBvagqlHm5YljQ	Kenan Erkılıç	VN	Active	Monetized	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.953476+00	2026-05-10 23:02:59.953476+00
C_MP0DP7QQ7V87	KUDO_FUTURE	\N	\N	UCMCioqY4zblWt7Uw0E0VTGA	The Benjamin Dixon Show	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.954497+00	2026-05-10 23:02:59.954497+00
C_MP0DP7QR1OOA	KUDO_FUTURE	\N	\N	UCH0RZN6yZnsyLtON2rIdycQ	Md moynul islam biddut	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.955531+00	2026-05-10 23:02:59.955531+00
C_MP0DP7QS3FT3	KUDO_FUTURE	\N	\N	UCBH_zdYvmCPQ03ApKtZ4rpA	Kudret Erdönmez	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.956542+00	2026-05-10 23:02:59.956542+00
C_MP0DP7QTV2XQ	KUDO_FUTURE	\N	\N	UCuM00ODObzWmOa-6va0wePQ	Regin Rex Panoy	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.957624+00	2026-05-10 23:02:59.957624+00
C_MP0DP7QUIDLQ	KUDO_FUTURE	\N	\N	UCRVJ_MWLQi9kJRuw-D8kjfA	murat can	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.958661+00	2026-05-10 23:02:59.958661+00
C_MP0DP7QVLL3W	KUDO_FUTURE	\N	\N	UCBDqFVCvwFBAkCxhWewca5g	İmanlı Gençlik	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.959774+00	2026-05-10 23:02:59.959774+00
C_MP0DP7QWI72A	KUDO_FUTURE	\N	\N	UCdcJVxhbzXb7l2Z_pOSGrBQ	Hak dostu	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.960885+00	2026-05-10 23:02:59.960885+00
C_MP0DP7QXIDF1	KUDO_FUTURE	\N	\N	UCfyJoS1gBtH26IGv3OXNU4w	wedsen 948	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.961951+00	2026-05-10 23:02:59.961951+00
C_MP0DP7QYXZSQ	KUDO_FUTURE	\N	\N	UCD8xJGMYQGn3BFIklh2yYcA	SELAMI BACIOĞLU BACIOĞLU TCARET	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.96303+00	2026-05-10 23:02:59.96303+00
C_MP0DP7R05ID8	KUDO_FUTURE	\N	\N	UCqLwLjX2fnR4G0enWQZRdkw	Marie Catabay	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.964137+00	2026-05-10 23:02:59.964137+00
C_MP0DP7R1HXKF	KUDO_FUTURE	\N	\N	UCpK7jiuwhhjR767BfxMRm7w	がんばんりまーす	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.965178+00	2026-05-10 23:02:59.965178+00
C_MP0DP7R27QN1	KUDO_FUTURE	\N	\N	UC3rcQuSsS_aiH5kY66cwcIQ	Rhomz DL	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.966192+00	2026-05-10 23:02:59.966192+00
C_MP0DP7R39A5R	KUDO_FUTURE	\N	\N	UCoV00zavDSRTSfVvVRs9B0w	yediiulya	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.967209+00	2026-05-10 23:02:59.967209+00
C_MP0DP7R4IR3D	KUDO_FUTURE	\N	\N	UC6ZZAKVrXztLUR8FzvoSiAA	Turan POLAT	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.968277+00	2026-05-10 23:02:59.968277+00
C_MP0DP7R5YHTL	KUDO_FUTURE	\N	\N	UC26_L5z9y5Ion5z7D_IDazg	Antonio García Leiva	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.969283+00	2026-05-10 23:02:59.969283+00
C_MP0DP7R6MV05	KUDO_FUTURE	\N	\N	UCBC1lwSeFWvuvf9Hait9qiQ	PAT BANTIYAN	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.9704+00	2026-05-10 23:02:59.9704+00
C_MP0DP7R7RRWR	KUDO_FUTURE	\N	\N	UCt7I2UuzpQRc4lWpS0RvRmA	the_rapper2026	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.971461+00	2026-05-10 23:02:59.971461+00
C_MP0DP7R8IVNS	KUDO_FUTURE	\N	\N	UCxD02FazqO8imBeS1sISe3w	Müslümanlar	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.972491+00	2026-05-10 23:02:59.972491+00
C_MP0DP7R9U5RP	KUDO_FUTURE	\N	\N	UCKqT3fcYuukloiOb861H-Yw	T BLEXUU	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.973497+00	2026-05-10 23:02:59.973497+00
C_MP0DP7RA2S1D	KUDO_FUTURE	\N	\N	UCWUCImUymxuIsm8du3bG2XA	Kids Em Ação	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.974506+00	2026-05-10 23:02:59.974506+00
C_MP0DP7RB4MIF	KUDO_FUTURE	\N	\N	UCPZL6bWqD9i9a4sipMI1g7g	الله أكبر	VN	Active	Pending	Healthy	0	0	1	0.00	\N	{}	\N	2026-05-10 23:02:59.97562+00	2026-05-10 23:02:59.97562+00
\.


--
-- Data for Name: cms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cms (id, name, currency, status, notes, created_at, updated_at) FROM stdin;
AUTOMOTOTUBE	Auto Mototube	CAD	Active		2026-05-10 20:06:58.27887+00	2026-05-10 20:06:58.27887+00
KUDO_FUTURE	KUDO Future	GBP	Active		2026-05-10 20:07:29.407674+00	2026-05-10 20:07:29.407674+00
KUDO_NETWORK	KUDO Network	GBP	Active		2026-05-10 20:08:02.198112+00	2026-05-10 20:08:02.198112+00
KUDO_MUSIC	KUDO Music	GBP	Active		2026-05-10 20:08:15.677027+00	2026-05-10 20:08:15.677027+00
KUDO_ANIMAL	KUDO Animal	GBP	Active		2026-05-10 20:08:25.233217+00	2026-05-10 20:08:25.233217+00
KUDO_PARTNERS	KUDO Partners	GBP	Active		2026-05-10 20:08:49.199947+00	2026-05-10 20:08:49.199947+00
KUDO_KIDS	KUDO Kids	GBP	Active		2026-05-10 20:08:59.796233+00	2026-05-10 20:08:59.796233+00
KUDO	KUDO DIY	GBP	Active		2026-05-10 20:01:29.601865+00	2026-05-10 20:13:10.560075+00
KUDO_ENTERTAINMENT	KUDO Entertainment	GBP	Active		2026-05-10 20:07:17.667724+00	2026-05-10 22:43:48.693701+00
\.


--
-- Data for Name: cms_daily; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cms_daily (cms_id, cms_name, snapshot_date, currency, revenue, views, channels, active_channels, monetized, demonetized, suspended, subscribers, violations, health_score, topics, partners, source, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: comment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comment (id, entity_type, entity_id, parent_id, author_id, author_email, author_name, body, mentions, created_at) FROM stdin;
\.


--
-- Data for Name: contract; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract (id, partner_id, contract_name, type, start_date, end_date, signed_date, status, rev_share, payment_terms, monthly_minimum, terms, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: contract_channel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract_channel (contract_id, channel_id, assigned_at, ended_at) FROM stdin;
\.


--
-- Data for Name: decision_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.decision_log (id, decision_type, title, context, decision, rationale, outcome, decided_by, decided_at) FROM stdin;
\.


--
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee (id, name, email, phone, username, password_hash, role, status, created_at, updated_at) FROM stdin;
EMP_MP08D5C7AT01	Test NV	\N	\N	testnv	$2b$10$aYYCHeX9otRA7WEgjEvx4uimNWGkfVKF4Z4vkPCZz59Bhq0MlO/j2	QC	Active	2026-05-10 20:33:38.927289+00	2026-05-10 20:33:38.927289+00
EMP_MP08D7TWJI5O	Nguyen van a	vana@gmail.com	3453451432	vana	$2b$10$eLu9BMaPju0QGdWc9yg0reS6uYPUWuisMKoOkiVgv7z.Y/6ivHtBK	Kế Toán	Active	2026-05-10 20:33:42.15136+00	2026-05-10 20:33:42.15136+00
EMP_MP0C3AXLFKVD	qc	qc@gmail.com	\N	qc	$2b$10$eQPTlfG80q6f7vFWhD69hOBb1i5zAl4NfHt.IL4yvI3OkaHY93xGS	QC	Active	2026-05-10 22:17:58.081595+00	2026-05-10 22:17:58.081595+00
\.


--
-- Data for Name: import_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.import_history (id, file_name, file_hash, file_type, row_count, imported_by, imported_at) FROM stdin;
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification (id, user_id, user_type, title, body, link, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: partner; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partner (id, name, email, phone, type, tier, rev_share, dept, status, notes, created_at, updated_at, company_name, contact_name, website, parent_id) FROM stdin;
P_MP07VUS1ZI1A	DILIGO			AFFILIATE	Standard	30.00	DILIGO	Active		2026-05-10 20:20:12.049284+00	2026-05-10 20:20:14.605676+00				P_MP07UK9WJZFC
P_MP07W73D3FTT	CAP MEDIA			AFFILIATE	Standard	30.00	CAP MEDIA	Active		2026-05-10 20:20:28.00954+00	2026-05-10 20:20:33.621402+00				P_MP07UK9WJZFC
P_MP08063U0P4N	GLOBIX	\N	\N	AFFILIATE	Standard	70.00	\N	Active	\N	2026-05-10 20:23:33.354778+00	2026-05-10 20:23:33.354778+00	\N	\N	\N	\N
P_MP0830231OGH	GSB	\N	\N	AFFILIATE	Standard	70.00	\N	Active	\N	2026-05-10 20:25:45.483405+00	2026-05-10 20:25:45.483405+00	\N	\N	\N	\N
P_MP085VZPTLWM	FBN			AFFILIATE	Standard	20.00	FBN	Active		2026-05-10 20:28:00.181505+00	2026-05-10 20:28:21.728377+00				P_MP0830231OGH
P_MP087EE940OP	GSB MEDIA			AFFILIATE	Standard	20.00	GSB MEDIA	Active		2026-05-10 20:29:10.689871+00	2026-05-10 20:29:20.825557+00				P_MP0830231OGH
P_MP0867GFGAZ8	DLB			AFFILIATE	Standard	20.00	DLB	Active		2026-05-10 20:28:15.04004+00	2026-05-10 20:29:25.273376+00				P_MP0830231OGH
P_MP086WXF9UZZ	Globix Media			AFFILIATE	Standard	30.00	Globix Media	Active		2026-05-10 20:28:48.051135+00	2026-05-10 20:29:31.857504+00				P_MP08063U0P4N
P_MP081JGTCOM4	STELLA MUSIC			AFFILIATE	Standard	30.00	STELLA MUSIC	Active		2026-05-10 20:24:37.325518+00	2026-05-10 20:29:40.588041+00				P_MP08063U0P4N
P_MP0810KQK955	XARO DIGITAL			AFFILIATE	Standard	30.00	XARO DIGITAL	Active		2026-05-10 20:24:12.842894+00	2026-05-10 20:29:45.243961+00				P_MP08063U0P4N
P_MP07UK9WJZFC	BUILDY			PRODUCTION	Premium	30.00		Active		2026-05-10 20:19:11.780873+00	2026-05-10 21:51:27.224336+00	BUILDY			\N
\.


--
-- Data for Name: partner_alert; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partner_alert (id, partner_id, partner_user_id, channel_id, title, body, required_action, status, sent_by, sent_at, resolved_at) FROM stdin;
\.


--
-- Data for Name: partner_contract; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partner_contract (id, partner_id, contract_number, title, file_name, file_path, file_size, upload_date, employee_id, created_at) FROM stdin;
CTR_MP08OLRGDFV3	P_MP081JGTCOM4	Số/ no. 0326-02/LA/Auto   Globix	Auto Mototube_Globix	Auto Mototube_Globix.pdf	/app/uploads/contracts/1778445753365_Auto_Mototube_Globix.pdf	7122355	2026-05-10	EMP_MP08D7TWJI5O	2026-05-10 20:42:33.395295+00
CTR_MP08P90S0QQE	P_MP07UK9WJZFC	\N	SERVICES AGREEMENT_Globix	SERVICES AGREEMENT_Globix.pdf	/app/uploads/contracts/1778445783521_SERVICES_AGREEMENT_Globix.pdf	2688079	2026-05-10	EMP_MP08D7TWJI5O	2026-05-10 20:43:03.53297+00
CTR_MP08QX0429KT	P_MP07UK9WJZFC	\N	Auto_Globix_ Principal Agreement	Auto_Globix_ Principal Agreement.docx	/app/uploads/contracts/1778445861261_Auto_Globix__Principal_Agreement.docx	1589937	2026-05-10	EMP_MP08D7TWJI5O	2026-05-10 20:44:21.268755+00
CTR_MP08QX1LPDT9	P_MP07UK9WJZFC	\N	KUDO_Globix_ Principal Agreement	KUDO_Globix_ Principal Agreement.docx	/app/uploads/contracts/1778445861321_KUDO_Globix__Principal_Agreement.docx	13815	2026-05-10	EMP_MP08D7TWJI5O	2026-05-10 20:44:21.321627+00
CTR_MP08QX32LUJW	P_MP07UK9WJZFC	\N	KUDO_GLOBIX_License Agreement_Share Revenue	KUDO_GLOBIX_License Agreement_Share Revenue.docx	/app/uploads/contracts/1778445861373_KUDO_GLOBIX_License_Agreement_Share_Revenue.docx	376972	2026-05-10	EMP_MP08D7TWJI5O	2026-05-10 20:44:21.374499+00
CTR_MP08QX4T7ITT	P_MP07UK9WJZFC	\N	KUDO_Globix_Outsourcing-Agreement	KUDO_Globix_Outsourcing-Agreement.docx	/app/uploads/contracts/1778445861429_KUDO_Globix_Outsourcing-Agreement.docx	2983338	2026-05-10	EMP_MP08D7TWJI5O	2026-05-10 20:44:21.437414+00
CTR_MP08QX5BRHHB	P_MP07UK9WJZFC	\N	SERVICES AGREEMENT_Globix	SERVICES AGREEMENT_Globix.pdf	/app/uploads/contracts/1778445861450_SERVICES_AGREEMENT_Globix.pdf	2688079	2026-05-10	EMP_MP08D7TWJI5O	2026-05-10 20:44:21.455789+00
\.


--
-- Data for Name: partner_user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partner_user (id, partner_id, email, full_name, phone, password_hash, status, approved_by, approved_at, last_login, created_at) FROM stdin;
PU_MP07YPDVRLKM	P_MP08063U0P4N	globix@gmail.com	LUU ANH TU		$2b$12$DIxKKxGuE7ZKNKjZDAbj3.V3HCFyxrERF.CAA1IdAT7h9kkjoJ1e2	Active	\N	2026-05-10 20:23:33.356243+00	\N	2026-05-10 20:22:25.166999+00
PU_MP082RV7DAKW	P_MP0830231OGH	gsb@gmai.com	GSB		$2b$12$pPM00vN.g5K.X/GE2GCwLeOZ0i7TSkq3MqLB01H/yilT.HC28z6lO	Active	\N	2026-05-10 20:25:45.484437+00	\N	2026-05-10 20:25:35.004327+00
PU_MP07RHX2A1R9	P_MP07UK9WJZFC	buildy@gmail.com	Nguyễn Ngọc Tấn		$2b$12$/Kxak2KfokQvs7xnaglVpeUhtQAi4pFpyz5bLOR1tRPYpG2DLUlue	Active	\N	2026-05-10 20:19:14.890879+00	2026-05-10 20:27:20.456673+00	2026-05-10 20:16:48.895172+00
\.


--
-- Data for Name: policy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.policy (id, name, content, application, images, created_at, updated_at) FROM stdin;
POL_MCN_COPYRIGHT	Chính sách Bản quyền & Content ID	YouTube sử dụng hệ thống Content ID để phát hiện nội dung vi phạm bản quyền. Mọi kênh trong mạng lưới phải tuân thủ:\n\n1. NGHIÊM CẤM sử dụng nhạc, hình ảnh, video của bên thứ ba mà không có giấy phép hợp lệ.\n2. Nếu kênh nhận copyright claim, đối tác phải phản hồi trong vòng 7 ngày làm việc.\n3. Kênh nhận 3 copyright strike trong 90 ngày sẽ bị đình chỉ toàn bộ kiếm tiền.\n4. Đối tác có trách nhiệm xử lý claim Content ID — MCN sẽ hỗ trợ dispute nếu nội dung hợp lệ.\n5. Toàn bộ nhạc nền phải thuộc kho nhạc được cấp phép (YouTube Audio Library, Epidemic Sound, Artlist).\n6. Vi phạm bản quyền nghiêm trọng sẽ dẫn đến chấm dứt hợp đồng ngay lập tức.	Áp dụng cho tất cả kênh trong mạng lưới kể từ ngày ký hợp đồng. Hiệu lực từ 01/01/2025.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
POL_MCN_COMMUNITY	Chính sách Vi phạm Quy tắc Cộng đồng YouTube	Quy tắc cộng đồng YouTube nghiêm cấm các nội dung độc hại, phân biệt đối xử và gây hại. Đối tác phải tuân thủ:\n\n1. NGHIÊM CẤM đăng tải nội dung bạo lực, khiêu dâm, phân biệt chủng tộc, kích động thù ghét.\n2. Không được đăng thông tin sai lệch về y tế, chính trị hoặc thiên tai.\n3. Nội dung dành cho trẻ em phải tuân thủ COPPA — bật chế độ "Made for Kids" khi cần thiết.\n4. Mỗi community guidelines strike có hiệu lực 90 ngày:\n   - Strike thứ 1: Cảnh cáo + giới hạn tính năng\n   - Strike thứ 2: Đình chỉ tải video 2 tuần\n   - Strike thứ 3: Chấm dứt kênh vĩnh viễn\n5. Kênh bị suspend do vi phạm cộng đồng: MCN không chịu trách nhiệm về doanh thu bị mất.\n6. Đối tác phải kiểm duyệt bình luận và xóa nội dung vi phạm trong vòng 24 giờ nếu được yêu cầu.	Áp dụng cho tất cả kênh và đối tác. Cập nhật theo YouTube Community Guidelines mới nhất.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
POL_MCN_MONETIZE	Chính sách Điều kiện Kiếm tiền (Monetization)	Để đủ điều kiện bật kiếm tiền và duy trì trạng thái Monetized, kênh phải đáp ứng:\n\nYÊU CẦU TỐI THIỂU:\n- 1.000 subscribers\n- 4.000 giờ xem trong 12 tháng gần nhất (hoặc 10 triệu lượt xem Shorts)\n- Không có community guidelines strike đang hiệu lực\n- Tuân thủ YouTube Partner Program policies\n\nDUY TRÌ MONETIZATION:\n- Kênh inactive (không upload trong 6 tháng) có thể bị tắt monetization\n- Doanh thu dưới $10 trong 12 tháng liên tiếp: MCN có quyền ngừng quản lý\n- Video vi phạm chính sách quảng cáo (Limited/No ads) phải được sửa chữa trong 14 ngày\n\nXỬ LÝ KHI BỊ TẮT MONETIZATION:\n- MCN hỗ trợ khiếu nại lên YouTube trong vòng 5 ngày làm việc\n- Trong thời gian khiếu nại, doanh thu bị tạm giữ chờ kết quả	Áp dụng cho tất cả kênh đăng ký kiếm tiền. Các ngưỡng có thể thay đổi theo chính sách YouTube.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
POL_MCN_REVENUE	Chính sách Chia sẻ Doanh thu	Tỷ lệ chia sẻ doanh thu giữa MCN và đối tác được quy định như sau:\n\nTỶ LỆ PHÂN CHIA:\n- Đối tác mới (0–12 tháng): MCN 30% / Đối tác 70%\n- Đối tác tiêu chuẩn (>12 tháng): MCN 25% / Đối tác 75%\n- Đối tác chiến lược (doanh thu > $5.000/tháng): MCN 20% / Đối tác 80%\n\nCHU KỲ THANH TOÁN:\n- Thanh toán định kỳ vào ngày 15 của tháng kế tiếp\n- Ngưỡng thanh toán tối thiểu: 500.000 VNĐ hoặc $20 USD\n- Số dư dưới ngưỡng sẽ được cộng dồn sang tháng tiếp theo\n\nCÁC KHOẢN KHẤU TRỪ:\n- Phí dịch vụ hỗ trợ kỹ thuật: 0% (bao gồm trong tỷ lệ MCN)\n- Thuế thu nhập cá nhân: đối tác tự chịu trách nhiệm khai báo\n- Hoàn tiền quảng cáo (Clawback): khấu trừ vào kỳ thanh toán tiếp theo\n\nKHIẾU NẠI DOANH THU: trong vòng 60 ngày kể từ ngày thanh toán.	Áp dụng cho tất cả hợp đồng ký từ 01/01/2025. Tỷ lệ cụ thể ghi trong phụ lục hợp đồng.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
POL_MCN_UPLOAD	Chính sách Chất lượng & Tiêu chuẩn Tải lên Video	Tất cả video được tải lên kênh trong mạng lưới phải đáp ứng các tiêu chuẩn chất lượng tối thiểu:\n\nKỸ THUẬT:\n- Độ phân giải tối thiểu: 1080p (khuyến nghị 4K cho nội dung mới)\n- Frame rate: 24fps, 30fps hoặc 60fps\n- Định dạng: MP4 (H.264), MOV, AVI\n- Thumbnail: 1280x720px, JPG/PNG, dung lượng dưới 2MB\n- Thumbnail phải phản ánh đúng nội dung video — không dùng clickbait\n\nMETADATA:\n- Tiêu đề: 60–100 ký tự, có từ khóa chính\n- Mô tả: tối thiểu 150 từ, có timestamp nếu video trên 10 phút\n- Tags: 10–20 tags liên quan\n- Chapter/Segment cho video trên 10 phút\n\nTẦN SUẤT ĐỀ XUẤT:\n- Kênh Entertainment: 3–5 video/tuần\n- Kênh Education: 2–3 video/tuần\n- Kênh Music: 1–2 video/tuần	Áp dụng cho tất cả kênh. MCN sẽ kiểm tra định kỳ hàng tháng.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
POL_MCN_BRANDSAFE	Chính sách Brand Safety & Quảng cáo An toàn	Để bảo vệ uy tín mạng lưới và thu hút nhà quảng cáo cao cấp, tất cả nội dung phải đảm bảo brand safety:\n\nNỘI DUNG BỊ GIỚI HẠN QUẢNG CÁO (Limited Ads):\n- Nội dung liên quan đến rượu bia, thuốc lá\n- Nội dung chính trị hoặc xã hội gây tranh cãi\n- Nội dung về vũ khí, bạo lực (dù không vi phạm community guidelines)\n- Ngôn ngữ thô tục hoặc không phù hợp gia đình\n\nNỘI DUNG CẤM HOÀN TOÀN (No Ads):\n- Nội dung khiêu dâm, bán khỏa thân\n- Nội dung liên quan đến ma túy, chất kích thích\n- Nội dung kích động bạo lực hoặc tự làm hại bản thân\n- Video vi phạm quyền riêng tư cá nhân\n\nYÊU CẦU AGE RESTRICTION:\n- Video có nội dung người lớn hợp pháp phải bật Age Restriction\n- MCN có quyền yêu cầu kênh bật/tắt Age Restriction để bảo vệ doanh thu mạng lưới\n\nMỤC TIÊU: Duy trì tỷ lệ CPM trên $2.5 USD cho toàn mạng lưới.	Áp dụng bắt buộc cho tất cả kênh. Kiểm tra tự động hàng tuần bởi hệ thống.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
POL_MCN_ACCESS	Chính sách Quản lý Kênh & Phân quyền Truy cập	Quy định về quyền quản lý kênh trong quá trình hợp tác với MCN:\n\nCẤP QUYỀN TRUY CẬP:\n- Đối tác phải cấp quyền Manager cho tài khoản MCN trong YouTube Studio\n- MCN có quyền: xem thống kê, quản lý Content ID, tối ưu metadata\n- MCN KHÔNG có quyền: xóa kênh, thay đổi mật khẩu, rút kênh ra khỏi Brand Account\n\nBẢO MẬT TÀI KHOẢN:\n- NGHIÊM CẤM chia sẻ thông tin đăng nhập Google Account với bất kỳ ai\n- Bật xác thực 2 bước (2FA) là bắt buộc\n- Thông báo ngay cho MCN nếu tài khoản bị xâm phạm\n\nĐỔI TÊN VÀ BRANDING:\n- Thay đổi tên kênh, logo, banner phải thông báo MCN trước 7 ngày\n- Kênh trong chương trình chiến lược phải sử dụng template thumbnail được MCN phê duyệt\n\nRÚT KHỎI MẠNG LƯỚI:\n- Thông báo trước tối thiểu 30 ngày\n- Hoàn tất thanh toán tất cả các kỳ chưa được giải ngân	Áp dụng ngay khi kênh được thêm vào mạng lưới. Cập nhật khi có thay đổi từ YouTube API.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
POL_MCN_PAYMENT	Chính sách Thanh toán & Tài chính	Quy trình thanh toán doanh thu cho đối tác trong mạng lưới MCN:\n\nTHANH TOÁN TRONG NƯỚC (VNĐ):\n- Phương thức: Chuyển khoản ngân hàng\n- Thời gian: Ngày 15–20 hàng tháng\n- Thông tin bắt buộc: Số TK ngân hàng, CMND/CCCD, MST nếu có\n\nTHANH TOÁN QUỐC TẾ (USD/GBP/CAD):\n- Phương thức: PayPal, Wise, chuyển khoản SWIFT\n- Thời gian: Ngày 20–25 hàng tháng (do thời gian xử lý quốc tế)\n- Phí chuyển tiền quốc tế: MCN hỗ trợ tối đa $5 mỗi giao dịch\n\nTÀI LIỆU CẦN CUNG CẤP:\n- Hóa đơn VAT (bắt buộc nếu doanh thu trên 10 triệu VNĐ/tháng)\n- Xác nhận tài khoản ngân hàng\n- Mã số thuế cá nhân hoặc doanh nghiệp\n\nGIỮ LẠI THANH TOÁN:\n- MCN có quyền tạm giữ thanh toán nếu phát hiện gian lận traffic\n- Thời gian điều tra tối đa 30 ngày kể từ khi phát hiện	Áp dụng cho tất cả đối tác nhận thanh toán qua MCN. Cập nhật theo quy định thuế hiện hành.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
POL_MCN_FRAUD	Chính sách Chống Gian lận Traffic & View Giả	MCN có chính sách ZERO TOLERANCE với các hành vi thao túng số liệu:\n\nCÁC HÀNH VI BỊ NGHIÊM CẤM:\n- Mua views, likes, comments, subscribers từ bất kỳ dịch vụ bên thứ ba\n- Sử dụng bot, script tự động để tăng số liệu\n- Click farming hoặc tổ chức xem giả có chủ đích\n- Chia sẻ link với yêu cầu xem để nhận thưởng (có tổ chức)\n- Sử dụng VPN/proxy để giả mạo địa lý xem video\n\nHẬU QUẢ:\n- Phát hiện lần 1: Cảnh cáo + yêu cầu giải trình trong 5 ngày\n- Phát hiện lần 2: Đình chỉ thanh toán 1 tháng + điều tra\n- Phát hiện lần 3: Chấm dứt hợp đồng + truy thu doanh thu từ traffic giả\n\nLƯU Ý QUAN TRỌNG: YouTube có thể thu hồi toàn bộ doanh thu từ traffic gian lận (Clawback). MCN không chịu trách nhiệm đối với khoản này.\n\nGIÁM SÁT: MCN sử dụng các công cụ phân tích (SocialBlade, YouTube Analytics) để giám sát định kỳ hàng tuần.	Áp dụng ngay lập tức cho tất cả kênh. Vi phạm sẽ dẫn đến chấm dứt hợp đồng.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
POL_MCN_TERMINATION	Chính sách Chấm dứt Hợp đồng	Quy định về việc chấm dứt hợp đồng giữa MCN và đối tác:\n\nMCN CÓ QUYỀN ĐƠN PHƯƠNG CHẤM DỨT KHI:\n- Vi phạm chính sách bản quyền nghiêm trọng (3 copyright strikes)\n- Vi phạm gian lận traffic lần thứ ba\n- Không thanh toán nghĩa vụ tài chính sau 30 ngày thông báo\n- Hành vi gây tổn hại uy tín MCN trên mạng xã hội hoặc truyền thông\n- Tự ý rút kênh khỏi mạng lưới mà không thông báo trước 30 ngày\n\nCHẤM DỨT THEO THỎA THUẬN:\n- Cả hai bên đồng ý bằng văn bản\n- Thời hạn hiệu lực: 30 ngày kể từ ngày ký biên bản thanh lý\n\nNGHĨA VỤ SAU CHẤM DỨT:\n- MCN hoàn trả toàn bộ doanh thu còn lại trong vòng 45 ngày\n- Đối tác xóa quyền truy cập của MCN khỏi tất cả kênh\n- Tài sản được tạo chung (artwork, scripts) phân chia theo phụ lục hợp đồng\n- Nếu MCN vi phạm: bồi thường 3 tháng doanh thu trung bình\n- Nếu đối tác vi phạm: mất toàn bộ doanh thu tháng hiện tại	Áp dụng cho tất cả hợp đồng đối tác. Kết hợp với điều khoản trong hợp đồng ký kết.	[]	2026-05-10 22:51:35.212238+00	2026-05-10 22:51:35.212238+00
\.


--
-- Data for Name: policy_update; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.policy_update (id, title, body, audience, audience_partner_ids, published_by, published_at) FROM stdin;
\.


--
-- Data for Name: revenue_daily; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revenue_daily (id, scope, scope_id, snapshot_date, currency, revenue, views, subscribers, channels_count, active_channels, source, notes, created_at) FROM stdin;
1	cms	KUDO	2026-05-08	USD	1275.96	459590	0	0	0	csv_import	\N	2026-05-10 20:12:05.984807+00
2	cms	KUDO	2026-05-07	USD	1242.66	447717	0	0	0	csv_import	\N	2026-05-10 20:12:05.988528+00
3	cms	KUDO	2026-05-06	USD	1448.62	497167	0	0	0	csv_import	\N	2026-05-10 20:12:05.989358+00
4	cms	KUDO	2026-05-05	USD	1367.28	534584	0	0	0	csv_import	\N	2026-05-10 20:12:05.990148+00
5	cms	KUDO	2026-05-04	USD	1131.09	422690	0	0	0	csv_import	\N	2026-05-10 20:12:05.990928+00
6	cms	KUDO	2026-05-03	USD	1410.00	499525	0	0	0	csv_import	\N	2026-05-10 20:12:05.991696+00
7	cms	KUDO	2026-05-02	USD	1263.14	423543	0	0	0	csv_import	\N	2026-05-10 20:12:05.992456+00
8	cms	KUDO	2026-05-01	USD	1261.63	429613	0	0	0	csv_import	\N	2026-05-10 20:12:05.993212+00
9	cms	KUDO	2026-04-30	USD	1301.21	400209	0	0	0	csv_import	\N	2026-05-10 20:12:05.994032+00
10	cms	KUDO	2026-04-29	USD	1480.14	443798	0	0	0	csv_import	\N	2026-05-10 20:12:05.994856+00
11	cms	KUDO	2026-04-28	USD	1342.81	381813	0	0	0	csv_import	\N	2026-05-10 20:12:05.995604+00
12	cms	KUDO	2026-04-27	USD	1390.48	424946	0	0	0	csv_import	\N	2026-05-10 20:12:05.996374+00
13	cms	KUDO	2026-04-26	USD	1539.32	478261	0	0	0	csv_import	\N	2026-05-10 20:12:05.99713+00
14	cms	KUDO	2026-04-25	USD	1376.58	437652	0	0	0	csv_import	\N	2026-05-10 20:12:05.997911+00
15	cms	KUDO	2026-04-24	USD	1361.92	390230	0	0	0	csv_import	\N	2026-05-10 20:12:05.998669+00
16	cms	KUDO	2026-04-23	USD	1408.23	377264	0	0	0	csv_import	\N	2026-05-10 20:12:05.999425+00
17	cms	KUDO	2026-04-22	USD	1734.90	513151	0	0	0	csv_import	\N	2026-05-10 20:12:06.000174+00
18	cms	KUDO	2026-04-21	USD	1589.98	496236	0	0	0	csv_import	\N	2026-05-10 20:12:06.000935+00
19	cms	KUDO	2026-04-20	USD	1375.37	444116	0	0	0	csv_import	\N	2026-05-10 20:12:06.0017+00
20	cms	KUDO	2026-04-19	USD	1478.29	453588	0	0	0	csv_import	\N	2026-05-10 20:12:06.002482+00
21	cms	KUDO	2026-04-18	USD	1174.58	391853	0	0	0	csv_import	\N	2026-05-10 20:12:06.003232+00
22	cms	KUDO	2026-04-17	USD	1222.17	372195	0	0	0	csv_import	\N	2026-05-10 20:12:06.004036+00
23	cms	KUDO	2026-04-16	USD	1626.92	543187	0	0	0	csv_import	\N	2026-05-10 20:12:06.004842+00
24	cms	KUDO	2026-04-15	USD	1708.26	491733	0	0	0	csv_import	\N	2026-05-10 20:12:06.005643+00
25	cms	KUDO	2026-04-14	USD	1502.56	416375	0	0	0	csv_import	\N	2026-05-10 20:12:06.006391+00
26	cms	KUDO	2026-04-13	USD	1371.94	399544	0	0	0	csv_import	\N	2026-05-10 20:12:06.007155+00
27	cms	KUDO	2026-04-12	USD	1149.76	328428	0	0	0	csv_import	\N	2026-05-10 20:12:06.007932+00
28	cms	KUDO	2026-04-11	USD	1459.46	391801	0	0	0	csv_import	\N	2026-05-10 20:12:06.008692+00
29	cms	KUDO_FUTURE	2026-05-08	USD	6095.35	2539782	0	0	0	csv_import	\N	2026-05-10 23:03:59.607299+00
30	cms	KUDO_FUTURE	2026-05-07	USD	5476.20	2294356	0	0	0	csv_import	\N	2026-05-10 23:03:59.610163+00
31	cms	KUDO_FUTURE	2026-05-06	USD	7295.23	2655192	0	0	0	csv_import	\N	2026-05-10 23:03:59.610997+00
32	cms	KUDO_FUTURE	2026-05-05	USD	5130.41	2202718	0	0	0	csv_import	\N	2026-05-10 23:03:59.611785+00
33	cms	KUDO_FUTURE	2026-05-04	USD	4066.63	1976498	0	0	0	csv_import	\N	2026-05-10 23:03:59.612531+00
34	cms	KUDO_FUTURE	2026-05-03	USD	4779.05	2283511	0	0	0	csv_import	\N	2026-05-10 23:03:59.613304+00
35	cms	KUDO_FUTURE	2026-05-02	USD	5004.52	2318563	0	0	0	csv_import	\N	2026-05-10 23:03:59.61416+00
36	cms	KUDO_FUTURE	2026-05-01	USD	4984.66	2461525	0	0	0	csv_import	\N	2026-05-10 23:03:59.614914+00
37	cms	KUDO_FUTURE	2026-04-30	USD	4790.13	2426109	0	0	0	csv_import	\N	2026-05-10 23:03:59.615697+00
38	cms	KUDO_FUTURE	2026-04-29	USD	5505.03	2965011	0	0	0	csv_import	\N	2026-05-10 23:03:59.616482+00
39	cms	KUDO_FUTURE	2026-04-28	USD	4422.84	1961756	0	0	0	csv_import	\N	2026-05-10 23:03:59.617508+00
40	cms	KUDO_FUTURE	2026-04-27	USD	4436.77	1882081	0	0	0	csv_import	\N	2026-05-10 23:03:59.618299+00
41	cms	KUDO_FUTURE	2026-04-26	USD	4713.52	2031438	0	0	0	csv_import	\N	2026-05-10 23:03:59.619073+00
42	cms	KUDO_FUTURE	2026-04-25	USD	5293.92	2032308	0	0	0	csv_import	\N	2026-05-10 23:03:59.619836+00
43	cms	KUDO_FUTURE	2026-04-24	USD	5271.03	1790815	0	0	0	csv_import	\N	2026-05-10 23:03:59.620578+00
44	cms	KUDO_FUTURE	2026-04-23	USD	4406.97	1408415	0	0	0	csv_import	\N	2026-05-10 23:03:59.621356+00
45	cms	KUDO_FUTURE	2026-04-22	USD	5710.29	1921942	0	0	0	csv_import	\N	2026-05-10 23:03:59.622112+00
46	cms	KUDO_FUTURE	2026-04-21	USD	5228.41	1801663	0	0	0	csv_import	\N	2026-05-10 23:03:59.622853+00
47	cms	KUDO_FUTURE	2026-04-20	USD	3686.33	1447899	0	0	0	csv_import	\N	2026-05-10 23:03:59.623591+00
48	cms	KUDO_FUTURE	2026-04-19	USD	3752.75	1458957	0	0	0	csv_import	\N	2026-05-10 23:03:59.624327+00
49	cms	KUDO_FUTURE	2026-04-18	USD	3838.10	1660094	0	0	0	csv_import	\N	2026-05-10 23:03:59.625071+00
50	cms	KUDO_FUTURE	2026-04-17	USD	3606.69	1467700	0	0	0	csv_import	\N	2026-05-10 23:03:59.625813+00
51	cms	KUDO_FUTURE	2026-04-16	USD	4799.57	1954774	0	0	0	csv_import	\N	2026-05-10 23:03:59.626551+00
52	cms	KUDO_FUTURE	2026-04-15	USD	4257.99	1782229	0	0	0	csv_import	\N	2026-05-10 23:03:59.627286+00
53	cms	KUDO_FUTURE	2026-04-14	USD	4665.85	1942510	0	0	0	csv_import	\N	2026-05-10 23:03:59.628067+00
54	cms	KUDO_FUTURE	2026-04-13	USD	4360.38	1934527	0	0	0	csv_import	\N	2026-05-10 23:03:59.628857+00
55	cms	KUDO_FUTURE	2026-04-12	USD	4093.12	1830765	0	0	0	csv_import	\N	2026-05-10 23:03:59.629663+00
56	cms	KUDO_FUTURE	2026-04-11	USD	5176.04	2747307	0	0	0	csv_import	\N	2026-05-10 23:03:59.630416+00
57	cms	KUDO_FUTURE	2026-04-10	USD	4707.15	2305373	0	0	0	csv_import	\N	2026-05-10 23:03:59.63117+00
58	cms	KUDO_FUTURE	2026-04-09	USD	3924.29	1851605	0	0	0	csv_import	\N	2026-05-10 23:03:59.631977+00
59	cms	KUDO_FUTURE	2026-04-08	USD	4002.63	1660594	0	0	0	csv_import	\N	2026-05-10 23:03:59.632925+00
60	cms	KUDO_FUTURE	2026-04-07	USD	4508.25	1795420	0	0	0	csv_import	\N	2026-05-10 23:03:59.633712+00
61	cms	KUDO_FUTURE	2026-04-06	USD	5602.29	2091361	0	0	0	csv_import	\N	2026-05-10 23:03:59.634804+00
62	cms	KUDO_FUTURE	2026-04-05	USD	5763.05	2084274	0	0	0	csv_import	\N	2026-05-10 23:03:59.63556+00
63	cms	KUDO_FUTURE	2026-04-04	USD	5346.66	2029065	0	0	0	csv_import	\N	2026-05-10 23:03:59.6363+00
64	cms	KUDO_FUTURE	2026-04-03	USD	6006.74	2302397	0	0	0	csv_import	\N	2026-05-10 23:03:59.637035+00
65	cms	KUDO_FUTURE	2026-04-02	USD	4848.11	1806215	0	0	0	csv_import	\N	2026-05-10 23:03:59.637773+00
66	cms	KUDO_FUTURE	2026-04-01	USD	4070.97	1551423	0	0	0	csv_import	\N	2026-05-10 23:03:59.638493+00
67	cms	KUDO_FUTURE	2026-03-31	USD	4534.79	1567564	0	0	0	csv_import	\N	2026-05-10 23:03:59.639953+00
68	cms	KUDO_FUTURE	2026-03-30	USD	4538.75	1546401	0	0	0	csv_import	\N	2026-05-10 23:03:59.640702+00
69	cms	KUDO_FUTURE	2026-03-29	USD	4719.80	1596850	0	0	0	csv_import	\N	2026-05-10 23:03:59.641445+00
70	cms	KUDO_FUTURE	2026-03-28	USD	5286.34	1599671	0	0	0	csv_import	\N	2026-05-10 23:03:59.642184+00
71	cms	KUDO_FUTURE	2026-03-27	USD	3901.56	1245893	0	0	0	csv_import	\N	2026-05-10 23:03:59.642903+00
72	cms	KUDO_FUTURE	2026-03-26	USD	3383.62	1117579	0	0	0	csv_import	\N	2026-05-10 23:03:59.643621+00
73	cms	KUDO_FUTURE	2026-03-25	USD	5149.45	1448868	0	0	0	csv_import	\N	2026-05-10 23:03:59.644368+00
74	cms	KUDO_FUTURE	2026-03-24	USD	6335.94	1780406	0	0	0	csv_import	\N	2026-05-10 23:03:59.645108+00
75	cms	KUDO_FUTURE	2026-03-23	USD	6559.53	1780170	0	0	0	csv_import	\N	2026-05-10 23:03:59.645841+00
76	cms	KUDO_FUTURE	2026-03-22	USD	5433.59	1763070	0	0	0	csv_import	\N	2026-05-10 23:03:59.646583+00
77	cms	KUDO_FUTURE	2026-03-21	USD	4234.92	1435363	0	0	0	csv_import	\N	2026-05-10 23:03:59.647317+00
78	cms	KUDO_FUTURE	2026-03-20	USD	4725.19	1695707	0	0	0	csv_import	\N	2026-05-10 23:03:59.648046+00
79	cms	KUDO_FUTURE	2026-03-19	USD	5713.63	1837632	0	0	0	csv_import	\N	2026-05-10 23:03:59.648808+00
80	cms	KUDO_FUTURE	2026-03-18	USD	4134.05	1596508	0	0	0	csv_import	\N	2026-05-10 23:03:59.649542+00
81	cms	KUDO_FUTURE	2026-03-17	USD	3521.28	1169967	0	0	0	csv_import	\N	2026-05-10 23:03:59.650282+00
82	cms	KUDO_FUTURE	2026-03-16	USD	2920.44	1168353	0	0	0	csv_import	\N	2026-05-10 23:03:59.651015+00
83	cms	KUDO_FUTURE	2026-03-15	USD	2652.67	1147350	0	0	0	csv_import	\N	2026-05-10 23:03:59.651739+00
84	cms	KUDO_FUTURE	2026-03-14	USD	2786.74	1197598	0	0	0	csv_import	\N	2026-05-10 23:03:59.652489+00
85	cms	KUDO_FUTURE	2026-03-13	USD	2780.33	1191083	0	0	0	csv_import	\N	2026-05-10 23:03:59.653253+00
86	cms	KUDO_FUTURE	2026-03-12	USD	2921.79	1282428	0	0	0	csv_import	\N	2026-05-10 23:03:59.653994+00
87	cms	KUDO_FUTURE	2026-03-11	USD	5374.10	2192735	0	0	0	csv_import	\N	2026-05-10 23:03:59.654725+00
88	cms	KUDO_FUTURE	2026-03-10	USD	7537.57	2943037	0	0	0	csv_import	\N	2026-05-10 23:03:59.65549+00
89	cms	KUDO_FUTURE	2026-03-09	USD	6389.35	2577719	0	0	0	csv_import	\N	2026-05-10 23:03:59.656245+00
90	cms	KUDO_FUTURE	2026-03-08	USD	4577.27	2435221	0	0	0	csv_import	\N	2026-05-10 23:03:59.657035+00
91	cms	KUDO_FUTURE	2026-03-07	USD	4618.73	2331956	0	0	0	csv_import	\N	2026-05-10 23:03:59.657903+00
92	cms	KUDO_FUTURE	2026-03-06	USD	3857.18	2006572	0	0	0	csv_import	\N	2026-05-10 23:03:59.658668+00
93	cms	KUDO_FUTURE	2026-03-05	USD	4385.01	2349602	0	0	0	csv_import	\N	2026-05-10 23:03:59.659426+00
94	cms	KUDO_FUTURE	2026-03-04	USD	3327.06	1964593	0	0	0	csv_import	\N	2026-05-10 23:03:59.660179+00
95	cms	KUDO_FUTURE	2026-03-03	USD	2781.61	1846743	0	0	0	csv_import	\N	2026-05-10 23:03:59.660946+00
96	cms	KUDO_FUTURE	2026-03-02	USD	2885.55	1977254	0	0	0	csv_import	\N	2026-05-10 23:03:59.661689+00
97	cms	KUDO_FUTURE	2026-03-01	USD	2726.35	2069586	0	0	0	csv_import	\N	2026-05-10 23:03:59.662417+00
98	cms	KUDO_FUTURE	2026-02-28	USD	4054.55	2530656	0	0	0	csv_import	\N	2026-05-10 23:03:59.663316+00
99	cms	KUDO_FUTURE	2026-02-27	USD	3504.18	2466977	0	0	0	csv_import	\N	2026-05-10 23:03:59.664101+00
100	cms	KUDO_FUTURE	2026-02-26	USD	2949.90	2126281	0	0	0	csv_import	\N	2026-05-10 23:03:59.664867+00
101	cms	KUDO_FUTURE	2026-02-25	USD	2662.72	1846690	0	0	0	csv_import	\N	2026-05-10 23:03:59.665624+00
102	cms	KUDO_FUTURE	2026-02-24	USD	3016.54	1970225	0	0	0	csv_import	\N	2026-05-10 23:03:59.666378+00
103	cms	KUDO_FUTURE	2026-02-23	USD	2889.23	1811002	0	0	0	csv_import	\N	2026-05-10 23:03:59.667138+00
104	cms	KUDO_FUTURE	2026-02-22	USD	3728.20	2183113	0	0	0	csv_import	\N	2026-05-10 23:03:59.667868+00
105	cms	KUDO_FUTURE	2026-02-21	USD	4156.69	2546532	0	0	0	csv_import	\N	2026-05-10 23:03:59.668595+00
106	cms	KUDO_FUTURE	2026-02-20	USD	3400.92	2047981	0	0	0	csv_import	\N	2026-05-10 23:03:59.669347+00
107	cms	KUDO_FUTURE	2026-02-19	USD	4029.51	2360129	0	0	0	csv_import	\N	2026-05-10 23:03:59.670074+00
108	cms	KUDO_FUTURE	2026-02-18	USD	4693.07	2938564	0	0	0	csv_import	\N	2026-05-10 23:03:59.670805+00
109	cms	KUDO_FUTURE	2026-02-17	USD	4145.61	2849013	0	0	0	csv_import	\N	2026-05-10 23:03:59.671541+00
110	cms	KUDO_FUTURE	2026-02-16	USD	3754.15	2489913	0	0	0	csv_import	\N	2026-05-10 23:03:59.672258+00
111	cms	KUDO_FUTURE	2026-02-15	USD	4574.72	2783509	0	0	0	csv_import	\N	2026-05-10 23:03:59.672978+00
112	cms	KUDO_FUTURE	2026-02-14	USD	5847.72	3566159	0	0	0	csv_import	\N	2026-05-10 23:03:59.673705+00
113	cms	KUDO_FUTURE	2026-02-13	USD	4949.60	2844360	0	0	0	csv_import	\N	2026-05-10 23:03:59.674446+00
114	cms	KUDO_FUTURE	2026-02-12	USD	4761.23	2437452	0	0	0	csv_import	\N	2026-05-10 23:03:59.675163+00
115	cms	KUDO_FUTURE	2026-02-11	USD	4380.80	2523150	0	0	0	csv_import	\N	2026-05-10 23:03:59.675934+00
116	cms	KUDO_FUTURE	2026-02-10	USD	6066.69	2879297	0	0	0	csv_import	\N	2026-05-10 23:03:59.676665+00
117	cms	KUDO_FUTURE	2026-02-09	USD	9412.16	3998894	0	0	0	csv_import	\N	2026-05-10 23:03:59.677481+00
118	cms	KUDO_FUTURE	2026-02-08	USD	13550.44	5869912	0	0	0	csv_import	\N	2026-05-10 23:03:59.678226+00
120	channel	C_MP07D68CMQPT	2026-05-11	USD	5121.97	630597	0	0	0	auto	\N	2026-05-11 00:04:55.756636+00
121	channel	C_MP07D68EIW5H	2026-05-11	USD	3353.38	551261	0	0	0	auto	\N	2026-05-11 00:04:55.757433+00
122	channel	C_MP07D68GLWP0	2026-05-11	USD	1568.28	505928	0	0	0	auto	\N	2026-05-11 00:04:55.758201+00
123	channel	C_MP07D68KYPDA	2026-05-11	USD	1373.96	356743	0	0	0	auto	\N	2026-05-11 00:04:55.759013+00
124	channel	C_MP07D68LJMOY	2026-05-11	USD	1188.20	325860	0	0	0	auto	\N	2026-05-11 00:04:55.759846+00
125	channel	C_MP07D68MF4KH	2026-05-11	USD	2360.51	282659	0	0	0	auto	\N	2026-05-11 00:04:55.760619+00
126	channel	C_MP07D68Q2AXT	2026-05-11	USD	174.83	105139	0	0	0	auto	\N	2026-05-11 00:04:55.761407+00
127	channel	C_MP07D68RSRL2	2026-05-11	USD	563.77	87206	0	0	0	auto	\N	2026-05-11 00:04:55.762156+00
128	channel	C_MP07D68SYY8Q	2026-05-11	USD	224.33	80435	0	0	0	auto	\N	2026-05-11 00:04:55.762926+00
129	channel	C_MP07D68UA8IA	2026-05-11	USD	391.57	71497	0	0	0	auto	\N	2026-05-11 00:04:55.763692+00
130	channel	C_MP07D68VPE97	2026-05-11	USD	282.30	60913	0	0	0	auto	\N	2026-05-11 00:04:55.764442+00
132	channel	C_MP07D68XGAOV	2026-05-11	USD	189.45	55380	0	0	0	auto	\N	2026-05-11 00:04:55.766605+00
134	channel	C_MP07D68ZFMU7	2026-05-11	USD	346.76	45033	0	0	0	auto	\N	2026-05-11 00:04:55.768165+00
135	channel	C_MP07D69084JZ	2026-05-11	USD	357.52	34891	0	0	0	auto	\N	2026-05-11 00:04:55.76891+00
136	channel	C_MP07D693ZX4Z	2026-05-11	USD	58.44	23481	0	0	0	auto	\N	2026-05-11 00:04:55.769651+00
137	channel	C_MP07D694NHNA	2026-05-11	USD	0.00	21636	0	0	0	auto	\N	2026-05-11 00:04:55.770398+00
138	channel	C_MP07D695R9SE	2026-05-11	USD	0.33	381	0	0	0	auto	\N	2026-05-11 00:04:55.771152+00
139	channel	C_MP07D696VUPZ	2026-05-11	USD	0.04	283	0	0	0	auto	\N	2026-05-11 00:04:55.771918+00
140	channel	C_MP07D6978XSF	2026-05-11	USD	0.00	16	0	0	0	auto	\N	2026-05-11 00:04:55.772663+00
141	channel	C_MP07D69B9V3Z	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:55.773403+00
142	channel	C_MP07D69CQY7W	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:55.774156+00
143	channel	C_MP07D68HWVNI	2026-05-11	USD	1483.62	437909	0	0	0	auto	\N	2026-05-11 00:04:55.774896+00
144	channel	C_MP07D6884HPY	2026-05-11	USD	0.00	27062	0	0	0	auto	\N	2026-05-11 00:04:55.775651+00
145	channel	C_MP07D6864ZZR	2026-05-11	USD	0.00	19522	0	0	0	auto	\N	2026-05-11 00:04:55.7764+00
146	channel	C_MP07D68IAJV7	2026-05-11	USD	342.17	361880	0	0	0	auto	\N	2026-05-11 00:04:55.777138+00
147	channel	C_MP07D68PMT3O	2026-05-11	USD	495.57	125685	0	0	0	auto	\N	2026-05-11 00:04:55.777882+00
148	channel	C_MP07D685S9CB	2026-05-11	USD	0.00	46164	0	0	0	auto	\N	2026-05-11 00:04:55.778617+00
149	channel	C_MP07D68FB7FT	2026-05-11	USD	661.39	511291	0	0	0	auto	\N	2026-05-11 00:04:55.779406+00
150	channel	C_MP07D698R9LD	2026-05-11	USD	0.00	9	0	0	0	auto	\N	2026-05-11 00:04:55.780247+00
151	channel	C_MP07D67VBWZS	2026-05-11	USD	0.00	59694	0	0	0	auto	\N	2026-05-11 00:04:55.781+00
152	channel	C_MP07D68A6Z5H	2026-05-11	USD	3515.30	799522	0	0	0	auto	\N	2026-05-11 00:04:55.78179+00
153	channel	C_MP07D69DYNBV	2026-05-11	USD	0.00	0	0	0	0	auto	\N	2026-05-11 00:04:55.782573+00
154	channel	C_MP07D68NFUBV	2026-05-11	USD	273.07	141899	0	0	0	auto	\N	2026-05-11 00:04:55.783408+00
155	channel	C_MP07D692JP6I	2026-05-11	USD	21.06	26724	0	0	0	auto	\N	2026-05-11 00:04:55.784184+00
156	channel	C_MP07D6896RCN	2026-05-11	USD	0.00	72639	0	0	0	auto	\N	2026-05-11 00:04:55.784928+00
157	channel	C_MP0DP7CUHPQE	2026-05-11	USD	468.91	11328194	0	0	0	auto	\N	2026-05-11 00:04:55.78568+00
158	channel	C_MP0DP7D0U8D1	2026-05-11	USD	9370.50	10793797	0	0	0	auto	\N	2026-05-11 00:04:55.786414+00
159	channel	C_MP0DP7D1EIRG	2026-05-11	USD	48589.85	9185556	0	0	0	auto	\N	2026-05-11 00:04:55.787147+00
160	channel	C_MP0DP7D2CE3Y	2026-05-11	USD	7614.79	9039074	0	0	0	auto	\N	2026-05-11 00:04:55.787928+00
161	channel	C_MP0DP7D3NH2O	2026-05-11	USD	1.28	7256105	0	0	0	auto	\N	2026-05-11 00:04:55.788675+00
163	channel	C_MP0DP7D5UBCB	2026-05-11	USD	13907.32	5732556	0	0	0	auto	\N	2026-05-11 00:04:55.790161+00
164	channel	C_MP0DP7D62AQ1	2026-05-11	USD	10592.88	5540688	0	0	0	auto	\N	2026-05-11 00:04:55.790899+00
165	channel	C_MP0DP7D7M37E	2026-05-11	USD	3225.72	4853509	0	0	0	auto	\N	2026-05-11 00:04:55.791679+00
166	channel	C_MP0DP7D8YQLF	2026-05-11	USD	22032.18	4803247	0	0	0	auto	\N	2026-05-11 00:04:55.79242+00
167	channel	C_MP0DP7DATNQ1	2026-05-11	USD	6051.32	4696822	0	0	0	auto	\N	2026-05-11 00:04:55.793167+00
168	channel	C_MP0DP7DBG7PV	2026-05-11	USD	15831.51	4165528	0	0	0	auto	\N	2026-05-11 00:04:55.793904+00
169	channel	C_MP0DP7DCIH4D	2026-05-11	USD	7507.49	3878308	0	0	0	auto	\N	2026-05-11 00:04:55.794645+00
170	channel	C_MP0DP7DDO6FR	2026-05-11	USD	17229.85	3864602	0	0	0	auto	\N	2026-05-11 00:04:55.795405+00
171	channel	C_MP0DP7DETSPI	2026-05-11	USD	4188.40	3560116	0	0	0	auto	\N	2026-05-11 00:04:55.796165+00
172	channel	C_MP0DP7DFDZJ0	2026-05-11	USD	8027.60	3513891	0	0	0	auto	\N	2026-05-11 00:04:55.796916+00
173	channel	C_MP0DP7DHQBX3	2026-05-11	USD	9942.01	3426212	0	0	0	auto	\N	2026-05-11 00:04:55.797661+00
174	channel	C_MP0DP7DI9Y4I	2026-05-11	USD	6218.00	3387133	0	0	0	auto	\N	2026-05-11 00:04:55.798402+00
175	channel	C_MP0DP7DJDQOL	2026-05-11	USD	11881.79	3234333	0	0	0	auto	\N	2026-05-11 00:04:55.799149+00
176	channel	C_MP0DP7DK9QFG	2026-05-11	USD	19602.76	3175250	0	0	0	auto	\N	2026-05-11 00:04:55.79994+00
177	channel	C_MP0DP7DLODX9	2026-05-11	USD	7806.18	2848857	0	0	0	auto	\N	2026-05-11 00:04:55.801042+00
178	channel	C_MP0DP7DM76W1	2026-05-11	USD	25167.62	2722086	0	0	0	auto	\N	2026-05-11 00:04:55.801883+00
179	channel	C_MP0DP7DNMT22	2026-05-11	USD	12883.80	2703629	0	0	0	auto	\N	2026-05-11 00:04:55.802648+00
180	channel	C_MP0DP7DOGQSP	2026-05-11	USD	865.22	2533246	0	0	0	auto	\N	2026-05-11 00:04:55.803449+00
181	channel	C_MP0DP7DP242E	2026-05-11	USD	7386.74	2466045	0	0	0	auto	\N	2026-05-11 00:04:55.804239+00
182	channel	C_MP0DP7DQYGGI	2026-05-11	USD	1900.10	2447919	0	0	0	auto	\N	2026-05-11 00:04:55.805226+00
183	channel	C_MP0DP7DROCGR	2026-05-11	USD	8038.04	2405828	0	0	0	auto	\N	2026-05-11 00:04:55.805998+00
184	channel	C_MP0DP7DS4C03	2026-05-11	USD	3433.50	2384309	0	0	0	auto	\N	2026-05-11 00:04:55.80679+00
185	channel	C_MP0DP7DT7M3R	2026-05-11	USD	2075.07	2351169	0	0	0	auto	\N	2026-05-11 00:04:55.807541+00
186	channel	C_MP0DP7DV7OS7	2026-05-11	USD	5577.04	2314331	0	0	0	auto	\N	2026-05-11 00:04:55.8083+00
187	channel	C_MP0DP7DW1SPJ	2026-05-11	USD	10920.19	2199237	0	0	0	auto	\N	2026-05-11 00:04:55.809041+00
188	channel	C_MP0DP7DXRGEH	2026-05-11	USD	4445.52	2127447	0	0	0	auto	\N	2026-05-11 00:04:55.809777+00
189	channel	C_MP0DP7DYOAV3	2026-05-11	USD	11037.09	2044988	0	0	0	auto	\N	2026-05-11 00:04:55.810535+00
190	channel	C_MP0DP7DZHFEW	2026-05-11	USD	3277.97	1973923	0	0	0	auto	\N	2026-05-11 00:04:55.811374+00
191	channel	C_MP0DP7E0P0SD	2026-05-11	USD	1280.77	1927031	0	0	0	auto	\N	2026-05-11 00:04:55.812142+00
192	channel	C_MP0DP7E1FYRR	2026-05-11	USD	314.28	1881638	0	0	0	auto	\N	2026-05-11 00:04:55.812908+00
193	channel	C_MP0DP7E2XQ4Z	2026-05-11	USD	2622.11	1720569	0	0	0	auto	\N	2026-05-11 00:04:55.813647+00
194	channel	C_MP0DP7E39CQZ	2026-05-11	USD	820.21	1671825	0	0	0	auto	\N	2026-05-11 00:04:55.814387+00
195	channel	C_MP0DP7E5LHQZ	2026-05-11	USD	4108.02	1640932	0	0	0	auto	\N	2026-05-11 00:04:55.815121+00
197	channel	C_MP0DP7E7MGM2	2026-05-11	USD	4506.75	1625996	0	0	0	auto	\N	2026-05-11 00:04:55.816699+00
198	channel	C_MP0DP7E8C3SY	2026-05-11	USD	5817.17	1528984	0	0	0	auto	\N	2026-05-11 00:04:55.81744+00
199	channel	C_MP0DP7E97A4E	2026-05-11	USD	595.71	1527924	0	0	0	auto	\N	2026-05-11 00:04:55.818182+00
200	channel	C_MP0DP7EAQVO3	2026-05-11	USD	8623.90	1330610	0	0	0	auto	\N	2026-05-11 00:04:55.818909+00
201	channel	C_MP0DP7EB629A	2026-05-11	USD	1849.10	1223576	0	0	0	auto	\N	2026-05-11 00:04:55.819646+00
202	channel	C_MP0DP7EC4ABQ	2026-05-11	USD	2557.69	935112	0	0	0	auto	\N	2026-05-11 00:04:55.820405+00
203	channel	C_MP0DP7ED5VH0	2026-05-11	USD	548.76	884326	0	0	0	auto	\N	2026-05-11 00:04:55.821214+00
204	channel	C_MP0DP7EE6F9R	2026-05-11	USD	85.74	856172	0	0	0	auto	\N	2026-05-11 00:04:55.821954+00
205	channel	C_MP07D6994TI2	2026-05-11	USD	1316.03	835892	0	0	0	auto	\N	2026-05-11 00:04:55.822701+00
206	channel	C_MP0DP7EIS04A	2026-05-11	USD	210.37	748571	0	0	0	auto	\N	2026-05-11 00:04:55.823456+00
207	channel	C_MP0DP7EJSW9X	2026-05-11	USD	356.66	732341	0	0	0	auto	\N	2026-05-11 00:04:55.824221+00
208	channel	C_MP0DP7EK29L9	2026-05-11	USD	816.39	713215	0	0	0	auto	\N	2026-05-11 00:04:55.82505+00
209	channel	C_MP0DP7ELKK8N	2026-05-11	USD	4196.33	673347	0	0	0	auto	\N	2026-05-11 00:04:55.825821+00
210	channel	C_MP0DP7EM30Y1	2026-05-11	USD	17.72	670045	0	0	0	auto	\N	2026-05-11 00:04:55.826566+00
211	channel	C_MP0DP7EN771H	2026-05-11	USD	1517.36	648004	0	0	0	auto	\N	2026-05-11 00:04:55.82739+00
212	channel	C_MP0DP7EO7846	2026-05-11	USD	2068.00	582233	0	0	0	auto	\N	2026-05-11 00:04:55.82817+00
213	channel	C_MP0DP7EPNX8X	2026-05-11	USD	616.27	536796	0	0	0	auto	\N	2026-05-11 00:04:55.829162+00
214	channel	C_MP0DP7EQDKOK	2026-05-11	USD	117.46	529471	0	0	0	auto	\N	2026-05-11 00:04:55.829981+00
215	channel	C_MP0DP7ES8D80	2026-05-11	USD	109.97	515852	0	0	0	auto	\N	2026-05-11 00:04:55.830771+00
216	channel	C_MP0DP7ET6U7C	2026-05-11	USD	1115.35	497729	0	0	0	auto	\N	2026-05-11 00:04:55.831594+00
217	channel	C_MP0DP7EUPN1R	2026-05-11	USD	394.97	471524	0	0	0	auto	\N	2026-05-11 00:04:55.832352+00
218	channel	C_MP0DP7EVA994	2026-05-11	USD	1495.52	445239	0	0	0	auto	\N	2026-05-11 00:04:55.83309+00
219	channel	C_MP0DP7EWM842	2026-05-11	USD	97.69	439658	0	0	0	auto	\N	2026-05-11 00:04:55.833861+00
220	channel	C_MP0DP7EX513H	2026-05-11	USD	0.00	365410	0	0	0	auto	\N	2026-05-11 00:04:55.834604+00
221	channel	C_MP0DP7EYSK9T	2026-05-11	USD	788.19	356708	0	0	0	auto	\N	2026-05-11 00:04:55.835388+00
222	channel	C_MP0DP7EZCY42	2026-05-11	USD	404.96	339683	0	0	0	auto	\N	2026-05-11 00:04:55.836141+00
223	channel	C_MP0DP7F07V1Z	2026-05-11	USD	1437.69	319569	0	0	0	auto	\N	2026-05-11 00:04:55.836896+00
225	channel	C_MP0DP7F3KTVP	2026-05-11	USD	639.44	283101	0	0	0	auto	\N	2026-05-11 00:04:55.838378+00
226	channel	C_MP0DP7F4OZV0	2026-05-11	USD	88.32	280075	0	0	0	auto	\N	2026-05-11 00:04:55.839112+00
227	channel	C_MP0DP7F5SOPZ	2026-05-11	USD	891.48	279435	0	0	0	auto	\N	2026-05-11 00:04:55.839891+00
228	channel	C_MP0DP7F6MLTF	2026-05-11	USD	795.62	256131	0	0	0	auto	\N	2026-05-11 00:04:55.84062+00
229	channel	C_MP0DP7F7WJUE	2026-05-11	USD	0.11	245772	0	0	0	auto	\N	2026-05-11 00:04:55.841356+00
230	channel	C_MP0DP7F9YR2Y	2026-05-11	USD	303.58	220639	0	0	0	auto	\N	2026-05-11 00:04:55.842115+00
231	channel	C_MP0DP7FA3KFI	2026-05-11	USD	1620.46	191076	0	0	0	auto	\N	2026-05-11 00:04:55.842868+00
232	channel	C_MP0DP7FBA0GG	2026-05-11	USD	210.13	188646	0	0	0	auto	\N	2026-05-11 00:04:55.843716+00
233	channel	C_MP0DP7FC4AZS	2026-05-11	USD	31.98	162733	0	0	0	auto	\N	2026-05-11 00:04:55.844467+00
234	channel	C_MP0DP7FDPE1X	2026-05-11	USD	403.19	118121	0	0	0	auto	\N	2026-05-11 00:04:55.845205+00
235	channel	C_MP0DP7FE0RRB	2026-05-11	USD	170.83	111060	0	0	0	auto	\N	2026-05-11 00:04:55.845938+00
236	channel	C_MP0DP7FFQIOS	2026-05-11	USD	1.03	106926	0	0	0	auto	\N	2026-05-11 00:04:55.846667+00
237	channel	C_MP0DP7FGNCCJ	2026-05-11	USD	0.00	77546	0	0	0	auto	\N	2026-05-11 00:04:55.84741+00
238	channel	C_MP0DP7FHU014	2026-05-11	USD	157.89	45262	0	0	0	auto	\N	2026-05-11 00:04:55.84815+00
239	channel	C_MP0DP7FIFL4T	2026-05-11	USD	232.11	44993	0	0	0	auto	\N	2026-05-11 00:04:55.848894+00
240	channel	C_MP0DP7FJY5CS	2026-05-11	USD	50.45	44863	0	0	0	auto	\N	2026-05-11 00:04:55.849621+00
241	channel	C_MP0DP7FKJ1UF	2026-05-11	USD	0.00	41924	0	0	0	auto	\N	2026-05-11 00:04:55.850348+00
242	channel	C_MP0DP7FLEYJR	2026-05-11	USD	133.37	39934	0	0	0	auto	\N	2026-05-11 00:04:55.851077+00
243	channel	C_MP0DP7FMBV76	2026-05-11	USD	0.29	17055	0	0	0	auto	\N	2026-05-11 00:04:55.851832+00
244	channel	C_MP0DP7FNPRY7	2026-05-11	USD	0.00	16595	0	0	0	auto	\N	2026-05-11 00:04:55.852574+00
245	channel	C_MP0DP7FPP4KC	2026-05-11	USD	1.29	12874	0	0	0	auto	\N	2026-05-11 00:04:55.853304+00
246	channel	C_MP0DP7FQ8TKF	2026-05-11	USD	0.00	9847	0	0	0	auto	\N	2026-05-11 00:04:55.854027+00
247	channel	C_MP0DP7FRMNU5	2026-05-11	USD	1.77	4050	0	0	0	auto	\N	2026-05-11 00:04:55.85475+00
248	channel	C_MP0DP7FSYW4G	2026-05-11	USD	0.00	3213	0	0	0	auto	\N	2026-05-11 00:04:55.855511+00
249	channel	C_MP0DP7FTFFLA	2026-05-11	USD	0.00	2983	0	0	0	auto	\N	2026-05-11 00:04:55.856241+00
250	channel	C_MP0DP7FU5Q30	2026-05-11	USD	1.85	2421	0	0	0	auto	\N	2026-05-11 00:04:55.856967+00
251	channel	C_MP0DP7FVZ53K	2026-05-11	USD	0.00	2221	0	0	0	auto	\N	2026-05-11 00:04:55.857689+00
252	channel	C_MP0DP7FW14HR	2026-05-11	USD	0.00	2112	0	0	0	auto	\N	2026-05-11 00:04:55.858426+00
253	channel	C_MP0DP7FX4UAA	2026-05-11	USD	0.00	2065	0	0	0	auto	\N	2026-05-11 00:04:55.85915+00
254	channel	C_MP0DP7FYBLVM	2026-05-11	USD	0.00	1936	0	0	0	auto	\N	2026-05-11 00:04:55.859942+00
256	channel	C_MP0DP7G0VITV	2026-05-11	USD	0.00	1377	0	0	0	auto	\N	2026-05-11 00:04:55.861452+00
257	channel	C_MP0DP7G1F20X	2026-05-11	USD	0.00	1342	0	0	0	auto	\N	2026-05-11 00:04:55.862187+00
258	channel	C_MP0DP7G2UUIQ	2026-05-11	USD	0.10	1321	0	0	0	auto	\N	2026-05-11 00:04:55.862917+00
259	channel	C_MP0DP7G4B09E	2026-05-11	USD	0.01	1301	0	0	0	auto	\N	2026-05-11 00:04:55.863672+00
260	channel	C_MP0DP7G56AGL	2026-05-11	USD	0.00	1243	0	0	0	auto	\N	2026-05-11 00:04:55.864421+00
262	channel	C_MP0DP7G7VIMA	2026-05-11	USD	1.00	1051	0	0	0	auto	\N	2026-05-11 00:04:55.86591+00
263	channel	C_MP0DP7G8TDRH	2026-05-11	USD	0.34	1019	0	0	0	auto	\N	2026-05-11 00:04:55.866636+00
264	channel	C_MP0DP7G9BXV5	2026-05-11	USD	1.67	985	0	0	0	auto	\N	2026-05-11 00:04:55.867646+00
265	channel	C_MP0DP7GAJVON	2026-05-11	USD	0.00	853	0	0	0	auto	\N	2026-05-11 00:04:55.868451+00
266	channel	C_MP0DP7GBX8NC	2026-05-11	USD	0.00	697	0	0	0	auto	\N	2026-05-11 00:04:55.8692+00
267	channel	C_MP0DP7GCZYDQ	2026-05-11	USD	2.15	635	0	0	0	auto	\N	2026-05-11 00:04:55.869964+00
268	channel	C_MP0DP7GD8NFT	2026-05-11	USD	0.00	587	0	0	0	auto	\N	2026-05-11 00:04:55.870709+00
269	channel	C_MP0DP7GEBDID	2026-05-11	USD	6.55	553	0	0	0	auto	\N	2026-05-11 00:04:55.871593+00
270	channel	C_MP0DP7GFZUKK	2026-05-11	USD	0.33	452	0	0	0	auto	\N	2026-05-11 00:04:55.872436+00
271	channel	C_MP0DP7GH5G2C	2026-05-11	USD	0.07	432	0	0	0	auto	\N	2026-05-11 00:04:55.873242+00
272	channel	C_MP0DP7GIA53H	2026-05-11	USD	0.07	429	0	0	0	auto	\N	2026-05-11 00:04:55.874057+00
273	channel	C_MP0DP7GJHLTF	2026-05-11	USD	0.01	400	0	0	0	auto	\N	2026-05-11 00:04:55.874809+00
274	channel	C_MP0DP7GK2CSU	2026-05-11	USD	2.79	394	0	0	0	auto	\N	2026-05-11 00:04:55.875575+00
275	channel	C_MP0DP7GL8OYX	2026-05-11	USD	0.00	380	0	0	0	auto	\N	2026-05-11 00:04:55.876328+00
276	channel	C_MP0DP7GMPUCM	2026-05-11	USD	1.75	357	0	0	0	auto	\N	2026-05-11 00:04:55.877081+00
277	channel	C_MP0DP7GN1ZWR	2026-05-11	USD	0.00	352	0	0	0	auto	\N	2026-05-11 00:04:55.877827+00
278	channel	C_MP0DP7GOS9Y1	2026-05-11	USD	0.16	304	0	0	0	auto	\N	2026-05-11 00:04:55.878588+00
279	channel	C_MP0DP7GP1YXQ	2026-05-11	USD	0.17	302	0	0	0	auto	\N	2026-05-11 00:04:55.879321+00
280	channel	C_MP0DP7GQDDSD	2026-05-11	USD	0.83	301	0	0	0	auto	\N	2026-05-11 00:04:55.880077+00
281	channel	C_MP0DP7GR5B3Q	2026-05-11	USD	0.62	301	0	0	0	auto	\N	2026-05-11 00:04:55.880827+00
282	channel	C_MP0DP7GSCBEJ	2026-05-11	USD	0.00	272	0	0	0	auto	\N	2026-05-11 00:04:55.881579+00
283	channel	C_MP0DP7GUX2AW	2026-05-11	USD	0.00	263	0	0	0	auto	\N	2026-05-11 00:04:55.882314+00
284	channel	C_MP0DP7GVE7LW	2026-05-11	USD	0.03	247	0	0	0	auto	\N	2026-05-11 00:04:55.883047+00
285	channel	C_MP0DP7GWBZUD	2026-05-11	USD	0.00	234	0	0	0	auto	\N	2026-05-11 00:04:55.883791+00
286	channel	C_MP0DP7GX1X8E	2026-05-11	USD	0.03	196	0	0	0	auto	\N	2026-05-11 00:04:55.884537+00
287	channel	C_MP0DP7GYXE5Q	2026-05-11	USD	0.05	187	0	0	0	auto	\N	2026-05-11 00:04:55.885273+00
288	channel	C_MP0DP7H0JHM2	2026-05-11	USD	0.00	181	0	0	0	auto	\N	2026-05-11 00:04:55.886025+00
290	channel	C_MP0DP7H2JH9I	2026-05-11	USD	0.08	174	0	0	0	auto	\N	2026-05-11 00:04:55.8876+00
291	channel	C_MP0DP7H3KH3R	2026-05-11	USD	0.12	171	0	0	0	auto	\N	2026-05-11 00:04:55.88836+00
292	channel	C_MP0DP7H4CVEM	2026-05-11	USD	0.00	165	0	0	0	auto	\N	2026-05-11 00:04:55.889111+00
293	channel	C_MP0DP7H5WEFN	2026-05-11	USD	0.00	164	0	0	0	auto	\N	2026-05-11 00:04:55.889941+00
294	channel	C_MP0DP7H6G3C8	2026-05-11	USD	0.00	158	0	0	0	auto	\N	2026-05-11 00:04:55.891167+00
295	channel	C_MP0DP7H7W8UF	2026-05-11	USD	0.07	154	0	0	0	auto	\N	2026-05-11 00:04:55.891955+00
296	channel	C_MP0DP7H8BG65	2026-05-11	USD	0.00	136	0	0	0	auto	\N	2026-05-11 00:04:55.892699+00
297	channel	C_MP0DP7H9YMO4	2026-05-11	USD	0.33	135	0	0	0	auto	\N	2026-05-11 00:04:55.89344+00
298	channel	C_MP0DP7HA12GL	2026-05-11	USD	0.03	129	0	0	0	auto	\N	2026-05-11 00:04:55.894191+00
299	channel	C_MP0DP7HB02HY	2026-05-11	USD	0.00	125	0	0	0	auto	\N	2026-05-11 00:04:55.894923+00
300	channel	C_MP0DP7HCJAPR	2026-05-11	USD	0.01	121	0	0	0	auto	\N	2026-05-11 00:04:55.895672+00
301	channel	C_MP0DP7HDU5AR	2026-05-11	USD	0.24	114	0	0	0	auto	\N	2026-05-11 00:04:55.896443+00
302	channel	C_MP0DP7HETBZ9	2026-05-11	USD	0.00	111	0	0	0	auto	\N	2026-05-11 00:04:55.897195+00
303	channel	C_MP0DP7HF721H	2026-05-11	USD	0.00	110	0	0	0	auto	\N	2026-05-11 00:04:55.897933+00
304	channel	C_MP0DP7HGQA5U	2026-05-11	USD	0.47	107	0	0	0	auto	\N	2026-05-11 00:04:55.898681+00
305	channel	C_MP0DP7HIVU3Y	2026-05-11	USD	0.00	100	0	0	0	auto	\N	2026-05-11 00:04:55.899517+00
306	channel	C_MP0DP7HJOPL3	2026-05-11	USD	0.00	97	0	0	0	auto	\N	2026-05-11 00:04:55.900313+00
307	channel	C_MP0DP7HKIALN	2026-05-11	USD	0.00	95	0	0	0	auto	\N	2026-05-11 00:04:55.901062+00
308	channel	C_MP0DP7HLZ6G9	2026-05-11	USD	0.01	94	0	0	0	auto	\N	2026-05-11 00:04:55.901814+00
309	channel	C_MP0DP7HMP1N0	2026-05-11	USD	0.00	89	0	0	0	auto	\N	2026-05-11 00:04:55.902555+00
310	channel	C_MP0DP7HNIZC1	2026-05-11	USD	0.00	85	0	0	0	auto	\N	2026-05-11 00:04:55.90334+00
311	channel	C_MP0DP7HOAM48	2026-05-11	USD	0.20	84	0	0	0	auto	\N	2026-05-11 00:04:55.904083+00
312	channel	C_MP0DP7HPEQP7	2026-05-11	USD	0.03	82	0	0	0	auto	\N	2026-05-11 00:04:55.905075+00
313	channel	C_MP0DP7HQ87IL	2026-05-11	USD	0.00	81	0	0	0	auto	\N	2026-05-11 00:04:55.905864+00
314	channel	C_MP0DP7HR2YZT	2026-05-11	USD	0.00	81	0	0	0	auto	\N	2026-05-11 00:04:55.906606+00
315	channel	C_MP0DP7HS2ONH	2026-05-11	USD	0.04	76	0	0	0	auto	\N	2026-05-11 00:04:55.907564+00
316	channel	C_MP0DP7HTF7KY	2026-05-11	USD	0.00	70	0	0	0	auto	\N	2026-05-11 00:04:55.908308+00
317	channel	C_MP0DP7HUMNAM	2026-05-11	USD	0.01	67	0	0	0	auto	\N	2026-05-11 00:04:55.909055+00
318	channel	C_MP0DP7HVTS8V	2026-05-11	USD	0.00	62	0	0	0	auto	\N	2026-05-11 00:04:55.909809+00
319	channel	C_MP0DP7HXE8YO	2026-05-11	USD	0.00	62	0	0	0	auto	\N	2026-05-11 00:04:55.910557+00
321	channel	C_MP0DP7HZWZVB	2026-05-11	USD	0.00	60	0	0	0	auto	\N	2026-05-11 00:04:55.91229+00
322	channel	C_MP0DP7I0Q8ND	2026-05-11	USD	0.01	59	0	0	0	auto	\N	2026-05-11 00:04:55.913035+00
323	channel	C_MP0DP7I1ZZCT	2026-05-11	USD	0.00	58	0	0	0	auto	\N	2026-05-11 00:04:55.913777+00
324	channel	C_MP0DP7I25FYX	2026-05-11	USD	0.01	57	0	0	0	auto	\N	2026-05-11 00:04:55.91461+00
325	channel	C_MP0DP7I36M7J	2026-05-11	USD	0.00	57	0	0	0	auto	\N	2026-05-11 00:04:55.915433+00
327	channel	C_MP0DP7I51PNC	2026-05-11	USD	0.00	56	0	0	0	auto	\N	2026-05-11 00:04:55.916965+00
328	channel	C_MP0DP7I6S1CR	2026-05-11	USD	0.00	54	0	0	0	auto	\N	2026-05-11 00:04:55.917709+00
329	channel	C_MP0DP7I7FVGO	2026-05-11	USD	0.05	53	0	0	0	auto	\N	2026-05-11 00:04:55.918452+00
330	channel	C_MP0DP7I8IHWI	2026-05-11	USD	0.00	53	0	0	0	auto	\N	2026-05-11 00:04:55.919226+00
331	channel	C_MP0DP7I97JNL	2026-05-11	USD	0.01	50	0	0	0	auto	\N	2026-05-11 00:04:55.919965+00
332	channel	C_MP0DP7IAT8H5	2026-05-11	USD	0.00	48	0	0	0	auto	\N	2026-05-11 00:04:55.920767+00
333	channel	C_MP0DP7IB3AQW	2026-05-11	USD	0.00	48	0	0	0	auto	\N	2026-05-11 00:04:55.921549+00
334	channel	C_MP0DP7ICM1DW	2026-05-11	USD	0.00	47	0	0	0	auto	\N	2026-05-11 00:04:55.922291+00
335	channel	C_MP0DP7IDKC32	2026-05-11	USD	0.02	47	0	0	0	auto	\N	2026-05-11 00:04:55.923032+00
336	channel	C_MP0DP7IEJ55W	2026-05-11	USD	0.01	45	0	0	0	auto	\N	2026-05-11 00:04:55.923993+00
337	channel	C_MP0DP7IFGNXN	2026-05-11	USD	0.00	43	0	0	0	auto	\N	2026-05-11 00:04:55.924738+00
338	channel	C_MP0DP7IHDUZV	2026-05-11	USD	0.13	41	0	0	0	auto	\N	2026-05-11 00:04:55.925484+00
339	channel	C_MP0DP7IIFUB9	2026-05-11	USD	0.00	40	0	0	0	auto	\N	2026-05-11 00:04:55.92622+00
340	channel	C_MP0DP7IJN78M	2026-05-11	USD	0.00	39	0	0	0	auto	\N	2026-05-11 00:04:55.92716+00
341	channel	C_MP0DP7IK9EAG	2026-05-11	USD	0.00	39	0	0	0	auto	\N	2026-05-11 00:04:55.927984+00
342	channel	C_MP0DP7IL736V	2026-05-11	USD	0.00	38	0	0	0	auto	\N	2026-05-11 00:04:55.928729+00
343	channel	C_MP0DP7IMZV1B	2026-05-11	USD	0.00	38	0	0	0	auto	\N	2026-05-11 00:04:55.929498+00
344	channel	C_MP0DP7INH155	2026-05-11	USD	0.00	38	0	0	0	auto	\N	2026-05-11 00:04:55.930266+00
345	channel	C_MP0DP7IOAC5A	2026-05-11	USD	0.00	37	0	0	0	auto	\N	2026-05-11 00:04:55.931071+00
346	channel	C_MP0DP7IPW0P8	2026-05-11	USD	0.00	36	0	0	0	auto	\N	2026-05-11 00:04:55.931821+00
347	channel	C_MP0DP7IQ0FTB	2026-05-11	USD	0.00	35	0	0	0	auto	\N	2026-05-11 00:04:55.932561+00
348	channel	C_MP0DP7IRCNIA	2026-05-11	USD	0.00	35	0	0	0	auto	\N	2026-05-11 00:04:55.933304+00
349	channel	C_MP0DP7ISP94Q	2026-05-11	USD	0.00	33	0	0	0	auto	\N	2026-05-11 00:04:55.934042+00
350	channel	C_MP0DP7ITOW50	2026-05-11	USD	0.00	32	0	0	0	auto	\N	2026-05-11 00:04:55.934789+00
351	channel	C_MP0DP7IU5J4C	2026-05-11	USD	0.00	32	0	0	0	auto	\N	2026-05-11 00:04:55.935525+00
352	channel	C_MP0DP7IWCWAZ	2026-05-11	USD	0.01	31	0	0	0	auto	\N	2026-05-11 00:04:55.936279+00
353	channel	C_MP0DP7IXDBB6	2026-05-11	USD	0.00	31	0	0	0	auto	\N	2026-05-11 00:04:55.937028+00
355	channel	C_MP0DP7IZJQIJ	2026-05-11	USD	0.00	30	0	0	0	auto	\N	2026-05-11 00:04:55.938568+00
356	channel	C_MP0DP7J0G9Q9	2026-05-11	USD	0.00	29	0	0	0	auto	\N	2026-05-11 00:04:55.939337+00
357	channel	C_MP0DP7J1IZHS	2026-05-11	USD	0.02	29	0	0	0	auto	\N	2026-05-11 00:04:55.940077+00
358	channel	C_MP0DP7J26HUD	2026-05-11	USD	0.00	29	0	0	0	auto	\N	2026-05-11 00:04:55.940805+00
359	channel	C_MP0DP7J3VRST	2026-05-11	USD	0.00	28	0	0	0	auto	\N	2026-05-11 00:04:55.941534+00
360	channel	C_MP0DP7J4VT2S	2026-05-11	USD	0.03	27	0	0	0	auto	\N	2026-05-11 00:04:55.942264+00
361	channel	C_MP0DP7J5Q3LW	2026-05-11	USD	0.00	26	0	0	0	auto	\N	2026-05-11 00:04:55.942991+00
362	channel	C_MP0DP7J690ZP	2026-05-11	USD	0.00	25	0	0	0	auto	\N	2026-05-11 00:04:55.943749+00
363	channel	C_MP0DP7J7T787	2026-05-11	USD	0.00	25	0	0	0	auto	\N	2026-05-11 00:04:55.944507+00
364	channel	C_MP0DP7J8RNYS	2026-05-11	USD	0.00	25	0	0	0	auto	\N	2026-05-11 00:04:55.945248+00
365	channel	C_MP0DP7J9HDSC	2026-05-11	USD	0.03	24	0	0	0	auto	\N	2026-05-11 00:04:55.945984+00
366	channel	C_MP0DP7JAIBYZ	2026-05-11	USD	0.00	24	0	0	0	auto	\N	2026-05-11 00:04:55.946719+00
367	channel	C_MP0DP7JBPU7Q	2026-05-11	USD	0.01	24	0	0	0	auto	\N	2026-05-11 00:04:55.947458+00
368	channel	C_MP0DP7JCLLXT	2026-05-11	USD	0.00	23	0	0	0	auto	\N	2026-05-11 00:04:55.948197+00
369	channel	C_MP0DP7JDVMVY	2026-05-11	USD	0.00	23	0	0	0	auto	\N	2026-05-11 00:04:55.948929+00
370	channel	C_MP0DP7JEKNHE	2026-05-11	USD	0.00	22	0	0	0	auto	\N	2026-05-11 00:04:55.94966+00
371	channel	C_MP0DP7JGP6GO	2026-05-11	USD	0.01	22	0	0	0	auto	\N	2026-05-11 00:04:55.950388+00
372	channel	C_MP0DP7JH14ED	2026-05-11	USD	0.00	22	0	0	0	auto	\N	2026-05-11 00:04:55.951118+00
373	channel	C_MP0DP7JI6Y5D	2026-05-11	USD	0.00	22	0	0	0	auto	\N	2026-05-11 00:04:55.951907+00
374	channel	C_MP0DP7JJ5JPW	2026-05-11	USD	0.00	21	0	0	0	auto	\N	2026-05-11 00:04:55.952665+00
375	channel	C_MP0DP7JKEJ7N	2026-05-11	USD	0.00	21	0	0	0	auto	\N	2026-05-11 00:04:55.953405+00
376	channel	C_MP0DP7JLNBBX	2026-05-11	USD	0.00	20	0	0	0	auto	\N	2026-05-11 00:04:55.954258+00
377	channel	C_MP0DP7JMXYSU	2026-05-11	USD	0.00	20	0	0	0	auto	\N	2026-05-11 00:04:55.954993+00
378	channel	C_MP0DP7JNZ8U9	2026-05-11	USD	0.00	19	0	0	0	auto	\N	2026-05-11 00:04:55.95574+00
379	channel	C_MP0DP7JOY1FJ	2026-05-11	USD	0.00	18	0	0	0	auto	\N	2026-05-11 00:04:55.956484+00
380	channel	C_MP0DP7JP0CM8	2026-05-11	USD	0.00	18	0	0	0	auto	\N	2026-05-11 00:04:55.957218+00
381	channel	C_MP0DP7JRPP4Q	2026-05-11	USD	0.01	18	0	0	0	auto	\N	2026-05-11 00:04:55.957948+00
382	channel	C_MP0DP7JSQV2W	2026-05-11	USD	0.00	17	0	0	0	auto	\N	2026-05-11 00:04:55.958674+00
383	channel	C_MP0DP7JT9DLQ	2026-05-11	USD	0.00	17	0	0	0	auto	\N	2026-05-11 00:04:55.959421+00
384	channel	C_MP0DP7JUVXQI	2026-05-11	USD	0.00	17	0	0	0	auto	\N	2026-05-11 00:04:55.960165+00
386	channel	C_MP0DP7JXQOIV	2026-05-11	USD	0.00	16	0	0	0	auto	\N	2026-05-11 00:04:55.961688+00
387	channel	C_MP0DP7JY97OP	2026-05-11	USD	0.00	16	0	0	0	auto	\N	2026-05-11 00:04:55.96242+00
388	channel	C_MP0DP7JZP3P4	2026-05-11	USD	0.00	16	0	0	0	auto	\N	2026-05-11 00:04:55.963153+00
389	channel	C_MP0DP7K0L49L	2026-05-11	USD	0.00	15	0	0	0	auto	\N	2026-05-11 00:04:55.963949+00
390	channel	C_MP0DP7K194CO	2026-05-11	USD	0.00	15	0	0	0	auto	\N	2026-05-11 00:04:55.964689+00
392	channel	C_MP0DP7K31P3C	2026-05-11	USD	0.01	15	0	0	0	auto	\N	2026-05-11 00:04:55.966186+00
393	channel	C_MP0DP7K4ZNNE	2026-05-11	USD	0.00	15	0	0	0	auto	\N	2026-05-11 00:04:55.966924+00
394	channel	C_MP0DP7K5CXIJ	2026-05-11	USD	0.00	14	0	0	0	auto	\N	2026-05-11 00:04:55.967704+00
395	channel	C_MP0DP7K61Y6G	2026-05-11	USD	0.02	14	0	0	0	auto	\N	2026-05-11 00:04:55.968449+00
396	channel	C_MP0DP7K73V4Q	2026-05-11	USD	0.00	14	0	0	0	auto	\N	2026-05-11 00:04:55.969184+00
397	channel	C_MP0DP7K8EMI7	2026-05-11	USD	0.00	13	0	0	0	auto	\N	2026-05-11 00:04:55.969935+00
398	channel	C_MP0DP7K9SISN	2026-05-11	USD	0.00	13	0	0	0	auto	\N	2026-05-11 00:04:55.970679+00
399	channel	C_MP0DP7KAB2LE	2026-05-11	USD	0.00	13	0	0	0	auto	\N	2026-05-11 00:04:55.971454+00
400	channel	C_MP0DP7KCK10J	2026-05-11	USD	0.00	13	0	0	0	auto	\N	2026-05-11 00:04:55.972255+00
401	channel	C_MP0DP7KDE923	2026-05-11	USD	0.00	12	0	0	0	auto	\N	2026-05-11 00:04:55.973024+00
402	channel	C_MP0DP7KEP56S	2026-05-11	USD	0.00	12	0	0	0	auto	\N	2026-05-11 00:04:55.973829+00
403	channel	C_MP0DP7KFV61H	2026-05-11	USD	0.00	12	0	0	0	auto	\N	2026-05-11 00:04:55.974609+00
404	channel	C_MP0DP7KGP0T4	2026-05-11	USD	0.00	12	0	0	0	auto	\N	2026-05-11 00:04:55.97537+00
405	channel	C_MP0DP7KH8EZY	2026-05-11	USD	0.00	12	0	0	0	auto	\N	2026-05-11 00:04:55.976105+00
406	channel	C_MP0DP7KIGT84	2026-05-11	USD	0.00	12	0	0	0	auto	\N	2026-05-11 00:04:55.97684+00
407	channel	C_MP0DP7KJDJM9	2026-05-11	USD	0.00	12	0	0	0	auto	\N	2026-05-11 00:04:55.977579+00
408	channel	C_MP0DP7KK9OAX	2026-05-11	USD	0.00	12	0	0	0	auto	\N	2026-05-11 00:04:55.97831+00
409	channel	C_MP0DP7KL5Z1E	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.979131+00
410	channel	C_MP0DP7KMV7X5	2026-05-11	USD	0.01	11	0	0	0	auto	\N	2026-05-11 00:04:55.979896+00
411	channel	C_MP0DP7KNW8N4	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.980627+00
412	channel	C_MP0DP7KOVUFJ	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.981358+00
413	channel	C_MP0DP7KPY7L0	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.982106+00
414	channel	C_MP0DP7KQWFYM	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.982869+00
415	channel	C_MP0DP7KR4060	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.983658+00
416	channel	C_MP0DP7KSRS03	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.984496+00
417	channel	C_MP0DP7KTXQGH	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.985235+00
418	channel	C_MP0DP7KUDX24	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.98599+00
420	channel	C_MP0DP7KWT3WZ	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.987486+00
421	channel	C_MP0DP7KXMD13	2026-05-11	USD	0.00	10	0	0	0	auto	\N	2026-05-11 00:04:55.988237+00
422	channel	C_MP0DP7KYLR1I	2026-05-11	USD	0.00	10	0	0	0	auto	\N	2026-05-11 00:04:55.988973+00
423	channel	C_MP0DP7L0AOQR	2026-05-11	USD	0.00	10	0	0	0	auto	\N	2026-05-11 00:04:55.989716+00
424	channel	C_MP0DP7L1WTM3	2026-05-11	USD	0.00	10	0	0	0	auto	\N	2026-05-11 00:04:55.99045+00
425	channel	C_MP0DP7L2MTYP	2026-05-11	USD	0.00	10	0	0	0	auto	\N	2026-05-11 00:04:55.991184+00
426	channel	C_MP0DP7L3ZIIB	2026-05-11	USD	0.00	10	0	0	0	auto	\N	2026-05-11 00:04:55.991949+00
427	channel	C_MP0DP7L4VPAC	2026-05-11	USD	0.00	10	0	0	0	auto	\N	2026-05-11 00:04:55.993052+00
428	channel	C_MP0DP7L5WFWK	2026-05-11	USD	0.00	10	0	0	0	auto	\N	2026-05-11 00:04:55.993882+00
429	channel	C_MP0DP7L6MVXN	2026-05-11	USD	0.00	10	0	0	0	auto	\N	2026-05-11 00:04:55.994641+00
430	channel	C_MP0DP7L7HUK3	2026-05-11	USD	0.00	9	0	0	0	auto	\N	2026-05-11 00:04:55.995589+00
431	channel	C_MP0DP7L8K9RR	2026-05-11	USD	0.00	9	0	0	0	auto	\N	2026-05-11 00:04:55.996332+00
432	channel	C_MP0DP7L92TY1	2026-05-11	USD	0.00	9	0	0	0	auto	\N	2026-05-11 00:04:55.997067+00
433	channel	C_MP0DP7LAWY8V	2026-05-11	USD	0.00	9	0	0	0	auto	\N	2026-05-11 00:04:55.997798+00
434	channel	C_MP0DP7LBH0RO	2026-05-11	USD	0.00	9	0	0	0	auto	\N	2026-05-11 00:04:55.998586+00
435	channel	C_MP0DP7LCZ9H2	2026-05-11	USD	0.00	8	0	0	0	auto	\N	2026-05-11 00:04:55.999378+00
436	channel	C_MP0DP7LDI7K3	2026-05-11	USD	0.00	8	0	0	0	auto	\N	2026-05-11 00:04:56.000123+00
437	channel	C_MP0DP7LEZM01	2026-05-11	USD	0.00	8	0	0	0	auto	\N	2026-05-11 00:04:56.000917+00
438	channel	C_MP0DP7LFKGB2	2026-05-11	USD	0.00	8	0	0	0	auto	\N	2026-05-11 00:04:56.001714+00
439	channel	C_MP0DP7LGTJNX	2026-05-11	USD	0.00	8	0	0	0	auto	\N	2026-05-11 00:04:56.002518+00
440	channel	C_MP0DP7LH2MLL	2026-05-11	USD	0.00	8	0	0	0	auto	\N	2026-05-11 00:04:56.003301+00
441	channel	C_MP0DP7LIW44R	2026-05-11	USD	0.00	8	0	0	0	auto	\N	2026-05-11 00:04:56.004054+00
442	channel	C_MP0DP7LJA35F	2026-05-11	USD	0.00	8	0	0	0	auto	\N	2026-05-11 00:04:56.004788+00
443	channel	C_MP0DP7LKXHHW	2026-05-11	USD	0.00	8	0	0	0	auto	\N	2026-05-11 00:04:56.005526+00
444	channel	C_MP0DP7LMUBE3	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.006256+00
445	channel	C_MP0DP7LNF99H	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.006986+00
446	channel	C_MP0DP7LO7GEL	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.007727+00
447	channel	C_MP0DP7LPBEAI	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.008471+00
448	channel	C_MP0DP7LQFCSL	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.009206+00
449	channel	C_MP0DP7LRWX24	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.009946+00
451	channel	C_MP0DP7LT2Y9H	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.011426+00
452	channel	C_MP0DP7LU5IPL	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.012156+00
453	channel	C_MP0DP7LVT6TD	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.012917+00
454	channel	C_MP0DP7LWLK4O	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.013661+00
455	channel	C_MP0DP7LX4N65	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.01443+00
457	channel	C_MP0DP7LZAJKC	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.015997+00
458	channel	C_MP0DP7M0KWJE	2026-05-11	USD	0.00	6	0	0	0	auto	\N	2026-05-11 00:04:56.016787+00
459	channel	C_MP0DP7M1ZGL7	2026-05-11	USD	0.00	6	0	0	0	auto	\N	2026-05-11 00:04:56.017533+00
460	channel	C_MP0DP7M2T67M	2026-05-11	USD	0.00	6	0	0	0	auto	\N	2026-05-11 00:04:56.018275+00
461	channel	C_MP0DP7M4Y9VO	2026-05-11	USD	0.00	6	0	0	0	auto	\N	2026-05-11 00:04:56.019014+00
462	channel	C_MP0DP7M5NJ0K	2026-05-11	USD	0.00	6	0	0	0	auto	\N	2026-05-11 00:04:56.019759+00
463	channel	C_MP0DP7M6UEMW	2026-05-11	USD	0.00	6	0	0	0	auto	\N	2026-05-11 00:04:56.020506+00
464	channel	C_MP0DP7M7F57D	2026-05-11	USD	0.00	6	0	0	0	auto	\N	2026-05-11 00:04:56.021238+00
465	channel	C_MP0DP7M8XGL1	2026-05-11	USD	0.00	6	0	0	0	auto	\N	2026-05-11 00:04:56.021969+00
466	channel	C_MP0DP7M9O4X8	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.0227+00
467	channel	C_MP0DP7MARQ73	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.023449+00
468	channel	C_MP0DP7MBJM9G	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.024189+00
469	channel	C_MP0DP7MCIC8K	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.024938+00
470	channel	C_MP0DP7MD8K1M	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.02568+00
471	channel	C_MP0DP7MEAPYV	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.026407+00
472	channel	C_MP0DP7MFSMC2	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.027152+00
473	channel	C_MP0DP7MGEAZT	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.027929+00
474	channel	C_MP0DP7MHPJ5T	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.028663+00
475	channel	C_MP0DP7MIS8XQ	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.029419+00
476	channel	C_MP0DP7MJD5VN	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.030176+00
477	channel	C_MP0DP7MK42AL	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.030909+00
478	channel	C_MP0DP7MM1UZX	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.031645+00
479	channel	C_MP0DP7MN3FE9	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.032393+00
480	channel	C_MP0DP7MOWBYL	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.03312+00
481	channel	C_MP0DP7MPKVSF	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.03385+00
482	channel	C_MP0DP7MQ1OK3	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.034578+00
483	channel	C_MP0DP7MR118O	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.03534+00
485	channel	C_MP0DP7MT7KN1	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.036818+00
486	channel	C_MP0DP7MUS1NG	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.037575+00
487	channel	C_MP0DP7MVHMVU	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.0383+00
488	channel	C_MP0DP7MWLLFO	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.039025+00
489	channel	C_MP0DP7MXDQ6B	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.039768+00
490	channel	C_MP0DP7MY620E	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.0405+00
491	channel	C_MP0DP7N0ACRC	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.041236+00
492	channel	C_MP0DP7N1RDP5	2026-05-11	USD	0.01	4	0	0	0	auto	\N	2026-05-11 00:04:56.041974+00
493	channel	C_MP0DP7N2X6VD	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.042713+00
494	channel	C_MP0DP7N3BYO2	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.043467+00
495	channel	C_MP0DP7N4XG50	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.044212+00
496	channel	C_MP0DP7N5HC6V	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.044962+00
497	channel	C_MP0DP7N6PVGD	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.0457+00
498	channel	C_MP0DP7N735SS	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.04643+00
499	channel	C_MP0DP7N8XV63	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.047166+00
500	channel	C_MP0DP7N9UQCG	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.047931+00
501	channel	C_MP0DP7NAHB07	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.048667+00
502	channel	C_MP0DP7NBMS9T	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.049417+00
503	channel	C_MP0DP7NCH3A0	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.050144+00
504	channel	C_MP0DP7ND6EJA	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.050888+00
505	channel	C_MP0DP7NEN5WF	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.051625+00
506	channel	C_MP0DP7NFAQHM	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.052358+00
507	channel	C_MP0DP7NG14Q1	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.053351+00
508	channel	C_MP0DP7NHHUHN	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.054214+00
509	channel	C_MP0DP7NITCLU	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.055032+00
510	channel	C_MP0DP7NJRE3N	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.055853+00
511	channel	C_MP0DP7NK7NIP	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.056644+00
512	channel	C_MP0DP7NL4LMK	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.0574+00
513	channel	C_MP0DP7NM92SZ	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.058176+00
514	channel	C_MP0DP7NOPDEF	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.058947+00
516	channel	C_MP0DP7NQEPPY	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.060444+00
517	channel	C_MP0DP7NRH9Y9	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.06119+00
518	channel	C_MP0DP7NSZP1X	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.061932+00
519	channel	C_MP0DP7NTDMA5	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.062667+00
520	channel	C_MP0DP7NUORH6	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.063414+00
522	channel	C_MP0DP7NWRHV5	2026-05-11	USD	0.01	3	0	0	0	auto	\N	2026-05-11 00:04:56.06494+00
523	channel	C_MP0DP7NXWCTI	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.065674+00
524	channel	C_MP0DP7NYOJP8	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.066404+00
525	channel	C_MP0DP7O0SW9E	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.067138+00
526	channel	C_MP0DP7O1864H	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.067922+00
527	channel	C_MP0DP7O22OC4	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.068684+00
528	channel	C_MP0DP7O3K7YF	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.06943+00
529	channel	C_MP0DP7O4JUOV	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.070272+00
530	channel	C_MP0DP7O5VKIC	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.071062+00
531	channel	C_MP0DP7O6KGHJ	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.071798+00
532	channel	C_MP0DP7O7H9BW	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.072533+00
533	channel	C_MP0DP7O8JL8M	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.073275+00
534	channel	C_MP0DP7O9PFNR	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.074017+00
535	channel	C_MP0DP7OAX98C	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.074759+00
536	channel	C_MP0DP7OB0398	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.075504+00
537	channel	C_MP0DP7OCT2FS	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.076234+00
538	channel	C_MP0DP7ODJ8RS	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.076978+00
539	channel	C_MP0DP7OEBARO	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.077723+00
540	channel	C_MP0DP7OFGGNX	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.078466+00
541	channel	C_MP0DP7OGSLB4	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.0792+00
542	channel	C_MP0DP7OHXWXK	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.079953+00
543	channel	C_MP0DP7OI9SAC	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.080686+00
544	channel	C_MP0DP7OJRDGS	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.081419+00
545	channel	C_MP0DP7OKCWUB	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.082166+00
546	channel	C_MP0DP7OMK183	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.082896+00
547	channel	C_MP0DP7ON26CU	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.083659+00
548	channel	C_MP0DP7OOGTMD	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.084454+00
550	channel	C_MP0DP7OQTTAB	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.085923+00
551	channel	C_MP0DP7ORR3E8	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.086646+00
552	channel	C_MP0DP7OSUCBF	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.087572+00
553	channel	C_MP0DP7OT8POB	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.08833+00
554	channel	C_MP0DP7OUAG5W	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.08906+00
555	channel	C_MP0DP7OVK0BP	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.089788+00
556	channel	C_MP0DP7OW3W4A	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.090512+00
557	channel	C_MP0DP7OXP4TE	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.091277+00
558	channel	C_MP0DP7OZ2YS3	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.092019+00
559	channel	C_MP0DP7P0RRBT	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.09275+00
560	channel	C_MP0DP7P13O1V	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.093496+00
561	channel	C_MP0DP7P21LKE	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.094219+00
562	channel	C_MP0DP7P3TV48	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.094957+00
563	channel	C_MP0DP7P4UR96	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.095694+00
564	channel	C_MP0DP7P5JMFP	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.096426+00
565	channel	C_MP0DP7P6C822	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.097156+00
566	channel	C_MP0DP7P76ULL	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.097917+00
567	channel	C_MP0DP7P821PO	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.098662+00
568	channel	C_MP0DP7P9LUWT	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.099393+00
569	channel	C_MP0DP7PBQ8S7	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.100137+00
570	channel	C_MP0DP7PCI103	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.100875+00
571	channel	C_MP0DP7PDJX7U	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.101668+00
572	channel	C_MP0DP7PESQRR	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.102408+00
573	channel	C_MP0DP7PFLF40	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.103156+00
574	channel	C_MP0DP7PG4IDN	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.103924+00
575	channel	C_MP0DP7PHC5XF	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.104654+00
576	channel	C_MP0DP7PIBUTO	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.105382+00
577	channel	C_MP0DP7PJHZGX	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.106106+00
578	channel	C_MP0DP7PK1EST	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.106845+00
579	channel	C_MP0DP7PLJKIM	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.107849+00
581	channel	C_MP0DP7PNNT5N	2026-05-11	USD	0.01	2	0	0	0	auto	\N	2026-05-11 00:04:56.109536+00
582	channel	C_MP0DP7PPC6M7	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.110297+00
583	channel	C_MP0DP7PQ5S35	2026-05-11	USD	0.01	2	0	0	0	auto	\N	2026-05-11 00:04:56.111033+00
584	channel	C_MP0DP7PRUZJ2	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.111818+00
585	channel	C_MP0DP7PSZYID	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.112557+00
119	channel	C_MP07D68BRYCB	2026-05-11	USD	2195.03	742755	0	0	0	auto	\N	2026-05-11 00:04:55.753974+00
131	channel	C_MP07D68WA6F9	2026-05-11	USD	202.41	56148	0	0	0	auto	\N	2026-05-11 00:04:55.765184+00
133	channel	C_MP07D68YIEWP	2026-05-11	USD	101.07	48209	0	0	0	auto	\N	2026-05-11 00:04:55.767385+00
162	channel	C_MP0DP7D41I40	2026-05-11	USD	17389.83	6810776	0	0	0	auto	\N	2026-05-11 00:04:55.789412+00
196	channel	C_MP0DP7E6UG34	2026-05-11	USD	15873.62	1633243	0	0	0	auto	\N	2026-05-11 00:04:55.815903+00
224	channel	C_MP0DP7F2D5J5	2026-05-11	USD	0.00	292989	0	0	0	auto	\N	2026-05-11 00:04:55.837639+00
587	channel	C_MP0DP7PUGRAX	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.114053+00
588	channel	C_MP0DP7PV68VB	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.114822+00
589	channel	C_MP0DP7PWSTRL	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.115578+00
590	channel	C_MP0DP7PXBELS	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.116313+00
591	channel	C_MP0DP7PYGYP4	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.117044+00
592	channel	C_MP0DP7PZTCRG	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.117774+00
593	channel	C_MP0DP7Q0N8MU	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.118504+00
594	channel	C_MP0DP7Q1HNB0	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.11926+00
595	channel	C_MP0DP7Q2KEYR	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.120015+00
596	channel	C_MP0DP7Q35QKL	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.120749+00
597	channel	C_MP0DP7Q4CPQ3	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.12149+00
598	channel	C_MP0DP7Q52R47	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.122214+00
599	channel	C_MP0DP7Q6M0NK	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.122956+00
600	channel	C_MP0DP7Q7IWAW	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.123987+00
601	channel	C_MP0DP7Q8IW18	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.124731+00
602	channel	C_MP0DP7Q9TSSK	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.125462+00
603	channel	C_MP0DP7QAOZSX	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.126191+00
604	channel	C_MP0DP7QBJH2R	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.126931+00
605	channel	C_MP0DP7QCIVW3	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.127673+00
606	channel	C_MP0DP7QDXEL3	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.128408+00
607	channel	C_MP0DP7QELGC9	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.129142+00
608	channel	C_MP0DP7QF870Y	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.129876+00
609	channel	C_MP0DP7QHMZQ3	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.130615+00
610	channel	C_MP0DP7QI3KS9	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.131575+00
611	channel	C_MP0DP7QJWBUQ	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.132388+00
613	channel	C_MP0DP7QLMHLK	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.134025+00
614	channel	C_MP0DP7QMR7FH	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.134836+00
615	channel	C_MP0DP7QN7H5T	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.135604+00
616	channel	C_MP0DP7QO1P95	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.136346+00
617	channel	C_MP0DP7QPCIXU	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.137092+00
618	channel	C_MP0DP7QQ7V87	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.137818+00
619	channel	C_MP0DP7QR1OOA	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.138544+00
620	channel	C_MP0DP7QS3FT3	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.139356+00
621	channel	C_MP0DP7QTV2XQ	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.140143+00
622	channel	C_MP0DP7QUIDLQ	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.140886+00
623	channel	C_MP0DP7QVLL3W	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.141615+00
624	channel	C_MP0DP7QWI72A	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.142359+00
625	channel	C_MP0DP7QXIDF1	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.143087+00
626	channel	C_MP0DP7QYXZSQ	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.143839+00
627	channel	C_MP0DP7R05ID8	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.144577+00
628	channel	C_MP0DP7R1HXKF	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.145322+00
629	channel	C_MP0DP7R27QN1	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.146039+00
630	channel	C_MP0DP7R39A5R	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.146765+00
631	channel	C_MP0DP7R4IR3D	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.147522+00
632	channel	C_MP0DP7R5YHTL	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.148253+00
633	channel	C_MP0DP7R6MV05	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.148983+00
634	channel	C_MP0DP7R7RRWR	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.149706+00
635	channel	C_MP0DP7R8IVNS	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.150456+00
636	channel	C_MP0DP7R9U5RP	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.151233+00
637	channel	C_MP0DP7RA2S1D	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.15199+00
638	channel	C_MP0DP7RB4MIF	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.152727+00
639	cms	KUDO_FUTURE	2026-05-11	GBP	416925.28	179715333	0	482	482	auto	\N	2026-05-11 00:04:56.156237+00
640	cms	KUDO	2026-05-11	GBP	26846.33	6716454	0	38	38	auto	\N	2026-05-11 00:04:56.157031+00
641	partner	P_MP07W73D3FTT	2026-05-11	USD	3788.37	941421	0	3	0	auto	\N	2026-05-11 00:04:56.158111+00
642	partner	P_MP07VUS1ZI1A	2026-05-11	USD	1979.19	563603	0	3	0	auto	\N	2026-05-11 00:04:56.158886+00
644	partner	P_MP081JGTCOM4	2026-05-11	USD	1003.56	938857	0	4	0	auto	\N	2026-05-11 00:04:56.160405+00
255	channel	C_MP0DP7FZWKH4	2026-05-11	USD	0.38	1788	0	0	0	auto	\N	2026-05-11 00:04:55.860701+00
261	channel	C_MP0DP7G66EUT	2026-05-11	USD	0.00	1070	0	0	0	auto	\N	2026-05-11 00:04:55.865168+00
289	channel	C_MP0DP7H1FBSE	2026-05-11	USD	0.02	178	0	0	0	auto	\N	2026-05-11 00:04:55.886778+00
320	channel	C_MP0DP7HYOLPV	2026-05-11	USD	0.00	61	0	0	0	auto	\N	2026-05-11 00:04:55.911544+00
326	channel	C_MP0DP7I4O4K2	2026-05-11	USD	0.02	56	0	0	0	auto	\N	2026-05-11 00:04:55.916204+00
354	channel	C_MP0DP7IYGUIO	2026-05-11	USD	0.02	30	0	0	0	auto	\N	2026-05-11 00:04:55.937834+00
385	channel	C_MP0DP7JV2X1X	2026-05-11	USD	0.01	16	0	0	0	auto	\N	2026-05-11 00:04:55.960941+00
391	channel	C_MP0DP7K262I7	2026-05-11	USD	0.00	15	0	0	0	auto	\N	2026-05-11 00:04:55.965439+00
419	channel	C_MP0DP7KVBCO0	2026-05-11	USD	0.00	11	0	0	0	auto	\N	2026-05-11 00:04:55.986732+00
450	channel	C_MP0DP7LSBG5P	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.010682+00
456	channel	C_MP0DP7LYEAFK	2026-05-11	USD	0.00	7	0	0	0	auto	\N	2026-05-11 00:04:56.015228+00
484	channel	C_MP0DP7MS1NGB	2026-05-11	USD	0.00	5	0	0	0	auto	\N	2026-05-11 00:04:56.036079+00
515	channel	C_MP0DP7NPBS6A	2026-05-11	USD	0.00	4	0	0	0	auto	\N	2026-05-11 00:04:56.059701+00
521	channel	C_MP0DP7NVZ6YL	2026-05-11	USD	0.00	3	0	0	0	auto	\N	2026-05-11 00:04:56.064175+00
549	channel	C_MP0DP7OPBZ79	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.085185+00
580	channel	C_MP0DP7PMJXBW	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.108732+00
586	channel	C_MP0DP7PTHF9U	2026-05-11	USD	0.00	2	0	0	0	auto	\N	2026-05-11 00:04:56.113302+00
612	channel	C_MP0DP7QK124P	2026-05-11	USD	0.00	1	0	0	0	auto	\N	2026-05-11 00:04:56.133222+00
643	partner	P_MP0867GFGAZ8	2026-05-11	USD	0.00	59694	0	1	0	auto	\N	2026-05-11 00:04:56.159649+00
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session (id, user_id, user_type, ip, user_agent, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: setting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.setting (key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: store; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store (key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: submission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submission (id, channel_id, partner_user_id, workflow_state, video_title, video_url, storage_type, storage_url, description, category, product_info, license, qc_inspection, admin_note, submitted_at, updated_at) FROM stdin;
SUB_MP0BVENCOUT7	\N	PU_MP07YPDVRLKM	QC_APPROVED	sgfgfdg	https://www.youtube.com/watch?v=WoAx97JWPWk&pp=ygUDdnVp	Google Drive	\N	dfggsdgds	Âm nhạc	\N	\N	\N	\N	2026-05-10 22:11:49.613545+00	2026-05-10 22:27:52.405112+00
SUB_MP0BS4MU1TJ3	\N	PU_MP07YPDVRLKM	QC_REJECTED	fgdfgg	https://www.youtube.com/watch?v=WoAx97JWPWk&pp=ygUDdnVp	\N	\N	\N	\N	\N	\N	\N	hfgh	2026-05-10 22:09:16.662863+00	2026-05-10 22:27:52.405112+00
SUB_MP0BRQLQJFW7	\N	PU_MP07YPDVRLKM	QC_APPROVED	ÁDFFSDF	https://www.youtube.com/watch?v=WoAx97JWPWk&pp=ygUDdnVp	YouTube	\N	\N	Âm nhạc	\N	\N	\N	\N	2026-05-10 22:08:58.479151+00	2026-05-10 22:27:52.405112+00
SUB_MP0APW26CHEG	\N	PU_MP07YPDVRLKM	QC_REJECTED	jlflafaf	https://www.youtube.com/watch?v=Qb4csNfubYk&pp=ygUDdnVp	\N	\N	\N	\N	\N	\N	\N	zzzzzzzzzzzzz	2026-05-10 21:39:32.622787+00	2026-05-10 22:27:52.405112+00
\.


--
-- Data for Name: submission_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submission_log (id, submission_id, from_state, to_state, by_user_id, by_email, by_role, note, ts) FROM stdin;
1	SUB_MP0APW26CHEG	\N	SUBMITTED	\N	\N	\N	\N	2026-05-10 21:39:32.626356+00
2	SUB_MP0BRQLQJFW7	\N	SUBMITTED	\N	\N	\N	\N	2026-05-10 22:08:58.481215+00
3	SUB_MP0BS4MU1TJ3	\N	SUBMITTED	\N	\N	\N	\N	2026-05-10 22:09:16.664637+00
4	SUB_MP0BVENCOUT7	\N	SUBMITTED	\N	\N	\N	\N	2026-05-10 22:11:49.616416+00
5	SUB_MP0BVENCOUT7	SUBMITTED	QC_REVIEWING	\N	\N	QC	\N	2026-05-10 22:19:44.70669+00
6	SUB_MP0BVENCOUT7	QC_REVIEWING	QC_APPROVED	\N	\N	QC	\N	2026-05-10 22:19:54.358427+00
7	SUB_MP0BS4MU1TJ3	SUBMITTED	QC_REVIEWING	\N	\N	QC	\N	2026-05-10 22:20:01.815681+00
8	SUB_MP0BS4MU1TJ3	QC_REVIEWING	QC_REJECTED	\N	\N	QC	hfgh	2026-05-10 22:20:10.617645+00
9	SUB_MP0BRQLQJFW7	SUBMITTED	QC_REVIEWING	\N	admin@meridian.vn	SUPER_ADMIN	\N	2026-05-10 22:22:54.14456+00
10	SUB_MP0BRQLQJFW7	QC_REVIEWING	QC_APPROVED	\N	admin@meridian.vn	SUPER_ADMIN	\N	2026-05-10 22:22:56.325332+00
11	SUB_MP0APW26CHEG	SUBMITTED	QC_REVIEWING	\N	admin@meridian.vn	SUPER_ADMIN	\N	2026-05-10 22:23:00.758598+00
12	SUB_MP0APW26CHEG	QC_REVIEWING	QC_REJECTED	\N	admin@meridian.vn	SUPER_ADMIN	zzzzzzzzzzzzz	2026-05-10 22:23:05.454307+00
\.


--
-- Data for Name: topic; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.topic (id, cms_id, name, dept, expected_channels, created_at) FROM stdin;
T_MP0ACLNLUF35	KUDO	DIY	\N	0	2026-05-10 21:29:12.609642+00
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."user" (id, email, full_name, password_hash, role, extra_roles, status, mfa_enabled, last_login, created_at) FROM stdin;
U_MP076XFBTZDR	admin@meridian.vn	Super Admin	$2b$12$O4NwzxwAp4QnX1pURvtH1OI9qzBBLFPf4MG3xjSOd0EgW1RPwcHnS	SUPER_ADMIN	\N	Active	f	2026-05-10 20:27:24.932197+00	2026-05-10 20:00:49.217444+00
\.


--
-- Data for Name: video; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.video (id, channel_id, yt_video_id, title, published_at, views, watch_time_hours, avg_view_duration, revenue, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: violation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.violation (id, channel_id, type, severity, status, video_title, video_url, detected_date, resolved_date, notes, metadata, created_at, name, violation_type, video_id, video_thumb, channel_name, channel_url, content, policy_id, resolution, result, images, image_captions, updated_at) FROM stdin;
VIO_MCN_001	C_MP07D68CMQPT	copyright_strike	High	Resolved	RUMPO Challenge #47 - Epic Fails Compilation	https://youtu.be/abc123xyz	2026-02-05	2026-02-18	Đây là copyright claim thứ 2 trong 90 ngày của kênh. Cần cảnh báo mức cao.	{}	2026-05-10 22:58:10.472079+00	Copyright Strike - Nhạc nền không có bản quyền	Âm thanh / Nhạc	abc123xyz	\N	RUMPO TV	https://youtube.com/c/rumpotv	Video sử dụng đoạn nhạc nền 2:15–3:40 từ bài "Blinding Lights" (The Weeknd) không có giấy phép. YouTube đã gửi copyright claim từ đơn vị quản lý bản quyền SME (Sony Music Entertainment). Doanh thu video bị giữ lại toàn bộ.	POL_MCN_COPYRIGHT	Đã liên hệ đối tác yêu cầu thay thế nhạc nền bằng YouTube Audio Library. Video được re-upload với nhạc mới. Claim được giải quyết sau 13 ngày.	Xử lý thành công	[]	{}	2026-05-10 22:58:10.472079+00
VIO_MCN_002	C_MP07D68A6Z5H	policy_violation	Medium	Resolved	¡GANÉ $10,000 EN UN DÍA! (Bí quyết kiếm tiền YouTube)	https://youtu.be/def456uvw	2026-02-12	2026-02-20	YouTube đã giảm đề xuất video này -78% so với 7 ngày trước. Ảnh hưởng nghiêm trọng đến impression.	{}	2026-05-10 22:58:10.472079+00	Thumbnail Clickbait - Nội dung không khớp tiêu đề	Hình ảnh / Video	def456uvw	\N	TEEZE ESP	https://youtube.com/c/teezeesp	Video sử dụng thumbnail hiển thị tờ tiền $10,000 và mặt người kinh ngạc. Nội dung thực tế là hướng dẫn kiếm tiền cơ bản, không liên quan đến con số trong thumbnail. YouTube gắn cờ "Misleading Thumbnail" và giới hạn đề xuất video.	POL_MCN_UPLOAD	Yêu cầu đối tác thay thumbnail và tiêu đề thực tế hơn trong 24h. Đã thay đổi, YouTube phục hồi đề xuất sau 5 ngày.	Xử lý thành công	[]	{}	2026-05-10 22:58:10.472079+00
VIO_MCN_003	C_MP07D68RSRL2	community_strike	Critical	Active	EXTREME PAIN CHALLENGE - Do Not Try At Home!!	https://youtu.be/ghi789rst	2026-02-19	\N	ĐÂY LÀ STRIKE ĐẦU TIÊN. Nếu có thêm 2 strike nữa trong 90 ngày, kênh sẽ bị xóa vĩnh viễn. Cần họp khẩn với đối tác.	{}	2026-05-10 22:58:10.472079+00	Community Guidelines Strike - Nội dung bạo lực trong challenge	Nội dung / Community	ghi789rst	\N	TEEZE CHALLENGE	https://youtube.com/c/teezechallenge	Video thực hiện thử thách tự gây đau cho bản thân (fire challenge variant). YouTube gửi Community Guidelines Strike thứ nhất cho kênh. Video bị gỡ xuống và kênh bị hạn chế tải video trong 1 tuần. Có nguy cơ ảnh hưởng đến toàn bộ monetization.	POL_MCN_COMMUNITY	Đang trong quá trình kháng cáo lên YouTube. Đồng thời tổ chức buổi đào tạo chính sách với đối tác.	Không thực hiện	[]	{}	2026-05-10 22:58:10.472079+00
VIO_MCN_004	C_MP07D68BRYCB	fraud_traffic	High	Appealed	RUMPO RETO EXTREMO #12 - Especial Marzo	https://youtu.be/jkl012mno	2026-03-03	\N	Đối tác phủ nhận mua view. Có thể do viral share trên forum MMO. Đang chờ YouTube xác minh. Doanh thu tháng 3 của kênh bị giữ: ước tính $1,240.	{}	2026-05-10 22:58:10.472079+00	Nghi ngờ Traffic Giả - View tăng bất thường	Traffic / Analytics	jkl012mno	\N	RUMPO TV SPANISH	https://youtube.com/c/rumpotvesp	Hệ thống phát hiện view tăng đột biến 847% trong 6 giờ (từ 12,000 lên 113,600 view). Tỷ lệ retention chỉ 8% (bình thường 42%). CTR từ nguồn "Direct URL" chiếm 91% (thông thường dưới 15%). YouTube đã đánh dấu video và tạm giữ doanh thu.	POL_MCN_FRAUD	Đã gửi giải trình lên YouTube kèm screenshot analytics chứng minh viral organic. Đang chờ phán quyết.	Đang xử lý	[]	{}	2026-05-10 22:58:10.472079+00
VIO_MCN_005	C_MP07D68SYY8Q	demonetize	Medium	Resolved	Scary Toys Collection + Horror Unboxing (18+)	https://youtu.be/pqr345stu	2026-03-07	2026-03-15	Kênh này có 78% audience dưới 13 tuổi. Upload nội dung kinh dị là rủi ro COPPA nghiêm trọng. Cần thảo luận lại định hướng nội dung với đối tác.	{}	2026-05-10 22:58:10.472079+00	Video bị tắt monetization - Nội dung nhạy cảm trẻ em	Monetization	pqr345stu	\N	Tina Toys Unboxing	https://youtube.com/c/tinatoysunboxing	Video unboxing đồ chơi kinh dị trên kênh thường xuyên làm nội dung trẻ em. YouTube tự động tắt monetization do phát hiện nội dung không phù hợp (horror elements + title gợi ý 18+) trên kênh có audience chủ yếu là trẻ dưới 13 tuổi. Đây là vi phạm COPPA tiềm ẩn.	POL_MCN_BRANDSAFE	Đối tác đồng ý xóa video và cam kết không làm nội dung kinh dị trên kênh này. Monetization được khôi phục sau 8 ngày.	Xử lý thành công	[]	{}	2026-05-10 22:58:10.472079+00
VIO_MCN_006	C_MP07D68VPE97	copyright_claim	High	Active	Best Gaming Moments COMPILATION March 2026	https://youtu.be/vwx678yza	2026-03-14	\N	Vi phạm nội bộ — kênh sử dụng nội dung của kênh khác trong cùng MCN. Cần xây dựng quy trình cấp phép sử dụng nội dung nội bộ.	{}	2026-05-10 22:58:10.472079+00	Copyright Claim - Tái sử dụng clip từ kênh đối tác khác	Âm thanh / Nhạc	vwx678yza	\N	XANDOR	https://youtube.com/c/xandor	Video compilation sử dụng 3 đoạn clip (mỗi đoạn 30–90 giây) từ kênh "TEEZE CHALLENGE" và "TEEZE DRONE ESP" trong cùng mạng lưới MCN mà không có thỏa thuận sử dụng nội dung. Hai kênh nguồn đã gửi claim thông qua Content ID. Doanh thu đang bị tạm giữ.	POL_MCN_COPYRIGHT	Đang tổ chức phiên hòa giải giữa 3 kênh. Yêu cầu XANDOR thêm credit và thỏa thuận chia sẻ doanh thu.	Không thực hiện	[]	{}	2026-05-10 22:58:10.472079+00
VIO_MCN_007	C_MP07D68GLWP0	brand_safety	High	Resolved	MEJORES SITIOS para GANAR DINERO ONLINE 2026	https://youtu.be/bcd901efg	2026-03-21	2026-04-01	Đối tác có thể bị phạt theo điều khoản hợp đồng do làm giảm CPM toàn mạng lưới. Cần kiểm tra các video khác của kênh này.	{}	2026-05-10 22:58:10.472079+00	Brand Safety - Quảng cáo/mention cờ bạc online	Nội dung / Community	bcd901efg	\N	RUMPO MAX ESP	https://youtube.com/c/rumpomaxesp	Video đề cập và cung cấp link affiliate đến 3 trang web cờ bạc online (Bet365, 1xBet, stake.com). YouTube tự động giới hạn quảng cáo (Limited Ads) và gửi cảnh báo Brand Safety. CPM của video giảm từ $4.2 xuống $0.8.	POL_MCN_BRANDSAFE	Yêu cầu xóa tất cả link cờ bạc và edit lại video. Đối tác tuân thủ. Video được YouTube xét duyệt lại sau 11 ngày, CPM phục hồi.	Xử lý thành công	[]	{}	2026-05-10 22:58:10.472079+00
VIO_MCN_008	C_MP07D68IAJV7	policy_violation	Low	Resolved	MINECRAFT pero es REAL en 2026 (NO CLICKBAIT)	https://youtu.be/hij234klm	2026-04-02	2026-04-09	Vi phạm nhẹ nhưng nếu tái diễn có thể ảnh hưởng đến khả năng đề xuất của toàn kênh.	{}	2026-05-10 22:58:10.472079+00	Vi phạm Metadata - Tag spam và tiêu đề gây hiểu lầm	Nội dung / Community	hij234klm	\N	Bootikati Español	https://youtube.com/c/bootikatiespanol	Video sử dụng 47 tags không liên quan đến nội dung (bao gồm tags của các kênh nổi tiếng như MrBeast, PewDiePie, Marques Brownlee). YouTube giảm đề xuất video và gửi cảnh báo về "tag spam". Tiêu đề dùng "NO CLICKBAIT" nhưng thực tế video là gameplay thông thường.	POL_MCN_UPLOAD	Yêu cầu đối tác sửa metadata: giảm còn 15 tags liên quan, cập nhật tiêu đề trung thực. Hoàn thành trong 24h.	Xử lý thành công	[]	{}	2026-05-10 22:58:10.472079+00
VIO_MCN_009	C_MP07D68FB7FT	admin_violation	Medium	Active	\N	\N	2026-04-05	\N	Tháng này là tháng thứ 2 liên tiếp đối tác không nộp hóa đơn đúng hạn. Cần gửi thông báo chính thức bằng văn bản.	{}	2026-05-10 22:58:10.472079+00	Vi phạm Tài chính - Không cung cấp hóa đơn VAT	Hành chính / Tài chính	\N	\N	Chaka Lala	https://youtube.com/c/chakalala	Kênh Chaka Lala đạt doanh thu 14.2 triệu VNĐ trong tháng 3/2026 (vượt ngưỡng 10 triệu yêu cầu hóa đơn VAT). Đối tác đã nhận nhắc nhở 3 lần (01/04, 03/04, 05/04) nhưng chưa cung cấp hóa đơn VAT hợp lệ. Theo chính sách thanh toán, MCN phải giữ lại 10% thuế khấu trừ tại nguồn cho đến khi nhận được hóa đơn.	POL_MCN_PAYMENT	Đã gửi email chính thức và thông báo tạm giữ 10% doanh thu. Đang chờ phản hồi từ đối tác.	Không thực hiện	[]	{}	2026-05-10 22:58:10.472079+00
VIO_MCN_010	C_MP07D68HWVNI	demonetize	Critical	Active	\N	\N	2026-04-10	\N	KHẨN CẤP: Nếu không hành động ngay, kênh có thể mất monetization hoàn toàn trong 30 ngày tới. Kênh này đang đóng góp $890/tháng vào doanh thu mạng lưới.	{}	2026-05-10 22:58:10.472079+00	Cảnh báo Demonetize liên tiếp - Nguy cơ mất Monetization	Monetization	\N	\N	KPOP Cubes DIY	https://youtube.com/c/kpopcubesdiy	Trong 60 ngày (01/02–10/04/2026), kênh KPOP Cubes DIY có 9 video bị demonetize hoàn toàn (No Ads) và 14 video bị Limited Ads. Tỷ lệ video monetized hiện chỉ còn 31% (so với mức bình thường 85%+). YouTube đã gửi cảnh báo chính thức về nguy cơ tắt monetization toàn kênh nếu tình trạng không cải thiện trong 30 ngày.\\n\\nCác nguyên nhân chính:\\n- 6 video sử dụng nhạc có lời không phù hợp\\n- 3 video có cảnh bạo lực nhẹ trong DIY (cắt, dùng kéo)\\n- 5 video thumbnail quá gợi cảm cho nội dung trẻ em\\n- Các video còn lại: ngôn ngữ trong video không phù hợp	POL_MCN_BRANDSAFE	Lên kế hoạch audit toàn bộ 50 video gần nhất. Đã liên hệ đối tác để họp khẩn vào 12/04/2026.	Không thực hiện	[]	{}	2026-05-10 22:58:10.472079+00
\.


--
-- Data for Name: violation_resolution; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.violation_resolution (id, violation_id, resolution, handler_info, resolved_date, result_date, result, notes, created_at) FROM stdin;
\.


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


--
-- Name: import_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.import_history_id_seq', 1, false);


--
-- Name: revenue_daily_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.revenue_daily_id_seq', 1170, true);


--
-- Name: submission_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.submission_log_id_seq', 12, true);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: channel channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_pkey PRIMARY KEY (id);


--
-- Name: channel channel_yt_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_yt_id_key UNIQUE (yt_id);


--
-- Name: cms_daily cms_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_daily
    ADD CONSTRAINT cms_daily_pkey PRIMARY KEY (cms_id, snapshot_date);


--
-- Name: cms cms_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms
    ADD CONSTRAINT cms_name_key UNIQUE (name);


--
-- Name: cms cms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms
    ADD CONSTRAINT cms_pkey PRIMARY KEY (id);


--
-- Name: comment comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_pkey PRIMARY KEY (id);


--
-- Name: contract_channel contract_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_channel
    ADD CONSTRAINT contract_channel_pkey PRIMARY KEY (contract_id, channel_id, assigned_at);


--
-- Name: contract contract_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract
    ADD CONSTRAINT contract_pkey PRIMARY KEY (id);


--
-- Name: decision_log decision_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_log
    ADD CONSTRAINT decision_log_pkey PRIMARY KEY (id);


--
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (id);


--
-- Name: employee employee_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_username_key UNIQUE (username);


--
-- Name: import_history import_history_file_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_history
    ADD CONSTRAINT import_history_file_hash_key UNIQUE (file_hash);


--
-- Name: import_history import_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_history
    ADD CONSTRAINT import_history_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: partner_alert partner_alert_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_alert
    ADD CONSTRAINT partner_alert_pkey PRIMARY KEY (id);


--
-- Name: partner_contract partner_contract_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_contract
    ADD CONSTRAINT partner_contract_pkey PRIMARY KEY (id);


--
-- Name: partner partner_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_name_key UNIQUE (name);


--
-- Name: partner partner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_pkey PRIMARY KEY (id);


--
-- Name: partner_user partner_user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_user
    ADD CONSTRAINT partner_user_email_key UNIQUE (email);


--
-- Name: partner_user partner_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_user
    ADD CONSTRAINT partner_user_pkey PRIMARY KEY (id);


--
-- Name: policy policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy
    ADD CONSTRAINT policy_pkey PRIMARY KEY (id);


--
-- Name: policy_update policy_update_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_update
    ADD CONSTRAINT policy_update_pkey PRIMARY KEY (id);


--
-- Name: revenue_daily revenue_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_daily
    ADD CONSTRAINT revenue_daily_pkey PRIMARY KEY (id);


--
-- Name: revenue_daily revenue_daily_scope_scope_id_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_daily
    ADD CONSTRAINT revenue_daily_scope_scope_id_snapshot_date_key UNIQUE (scope, scope_id, snapshot_date);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: setting setting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.setting
    ADD CONSTRAINT setting_pkey PRIMARY KEY (key);


--
-- Name: store store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_pkey PRIMARY KEY (key);


--
-- Name: submission_log submission_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_log
    ADD CONSTRAINT submission_log_pkey PRIMARY KEY (id);


--
-- Name: submission submission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission
    ADD CONSTRAINT submission_pkey PRIMARY KEY (id);


--
-- Name: topic topic_cms_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic
    ADD CONSTRAINT topic_cms_id_name_key UNIQUE (cms_id, name);


--
-- Name: topic topic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic
    ADD CONSTRAINT topic_pkey PRIMARY KEY (id);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: video video_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video
    ADD CONSTRAINT video_pkey PRIMARY KEY (id);


--
-- Name: violation violation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation
    ADD CONSTRAINT violation_pkey PRIMARY KEY (id);


--
-- Name: violation_resolution violation_resolution_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation_resolution
    ADD CONSTRAINT violation_resolution_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_action ON public.audit_log USING btree (action, created_at DESC);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_channel_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_active ON public.channel USING btree (cms_id, monthly_revenue DESC) WHERE (status = 'Active'::text);


--
-- Name: idx_channel_cms; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_cms ON public.channel USING btree (cms_id);


--
-- Name: idx_channel_monetization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_monetization ON public.channel USING btree (monetization);


--
-- Name: idx_channel_name_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_name_fts ON public.channel USING gin (to_tsvector('english'::regconfig, name));


--
-- Name: idx_channel_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_partner ON public.channel USING btree (partner_id);


--
-- Name: idx_channel_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_status ON public.channel USING btree (status);


--
-- Name: idx_channel_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_topic ON public.channel USING btree (topic_id);


--
-- Name: idx_channel_yt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_yt ON public.channel USING btree (yt_id);


--
-- Name: idx_cms_daily_cms; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_daily_cms ON public.cms_daily USING btree (cms_id, snapshot_date DESC);


--
-- Name: idx_cms_daily_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_daily_date ON public.cms_daily USING btree (snapshot_date DESC);


--
-- Name: idx_cms_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_status ON public.cms USING btree (status);


--
-- Name: idx_comment_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_entity ON public.comment USING btree (entity_type, entity_id);


--
-- Name: idx_contract_channel_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_channel_channel ON public.contract_channel USING btree (channel_id);


--
-- Name: idx_contract_channel_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_channel_contract ON public.contract_channel USING btree (contract_id);


--
-- Name: idx_contract_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_dates ON public.contract USING btree (start_date, end_date);


--
-- Name: idx_contract_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_partner ON public.contract USING btree (partner_id);


--
-- Name: idx_contract_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_status ON public.contract USING btree (status);


--
-- Name: idx_employee_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_status ON public.employee USING btree (status);


--
-- Name: idx_import_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_hash ON public.import_history USING btree (file_hash);


--
-- Name: idx_notification_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_user ON public.notification USING btree (user_id, created_at DESC) WHERE (read_at IS NULL);


--
-- Name: idx_partner_alert_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_alert_partner ON public.partner_alert USING btree (partner_id);


--
-- Name: idx_partner_alert_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_alert_status ON public.partner_alert USING btree (status);


--
-- Name: idx_partner_contract_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_contract_date ON public.partner_contract USING btree (upload_date DESC);


--
-- Name: idx_partner_contract_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_contract_employee ON public.partner_contract USING btree (employee_id);


--
-- Name: idx_partner_contract_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_contract_partner ON public.partner_contract USING btree (partner_id);


--
-- Name: idx_partner_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_status ON public.partner USING btree (status);


--
-- Name: idx_partner_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_type ON public.partner USING btree (type);


--
-- Name: idx_partner_user_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_user_partner ON public.partner_user USING btree (partner_id);


--
-- Name: idx_partner_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_user_status ON public.partner_user USING btree (status);


--
-- Name: idx_revenue_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revenue_date ON public.revenue_daily USING btree (snapshot_date DESC);


--
-- Name: idx_revenue_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revenue_scope ON public.revenue_daily USING btree (scope, scope_id);


--
-- Name: idx_revenue_scope_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revenue_scope_date ON public.revenue_daily USING btree (scope, scope_id, snapshot_date DESC);


--
-- Name: idx_session_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_expires ON public.session USING btree (expires_at);


--
-- Name: idx_session_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_user ON public.session USING btree (user_id);


--
-- Name: idx_store_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_updated ON public.store USING btree (updated_at DESC);


--
-- Name: idx_submission_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submission_channel ON public.submission USING btree (channel_id);


--
-- Name: idx_submission_log_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submission_log_sub ON public.submission_log USING btree (submission_id, ts DESC);


--
-- Name: idx_submission_partner_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submission_partner_user ON public.submission USING btree (partner_user_id);


--
-- Name: idx_submission_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submission_pending ON public.submission USING btree (submitted_at DESC) WHERE (workflow_state = ANY (ARRAY['SUBMITTED'::text, 'QC_REVIEWING'::text, 'QC_APPROVED'::text, 'CHANNEL_PROVISIONING'::text]));


--
-- Name: idx_submission_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submission_state ON public.submission USING btree (workflow_state);


--
-- Name: idx_topic_cms; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_cms ON public.topic USING btree (cms_id);


--
-- Name: idx_video_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_channel ON public.video USING btree (channel_id);


--
-- Name: idx_video_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_published ON public.video USING btree (published_at DESC);


--
-- Name: idx_violation_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violation_channel ON public.violation USING btree (channel_id);


--
-- Name: idx_violation_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violation_date ON public.violation USING btree (detected_date DESC);


--
-- Name: idx_violation_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violation_open ON public.violation USING btree (channel_id, detected_date DESC) WHERE (status = 'Active'::text);


--
-- Name: idx_violation_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violation_policy ON public.violation USING btree (policy_id);


--
-- Name: idx_violation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violation_status ON public.violation USING btree (status);


--
-- Name: idx_vr_violation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vr_violation ON public.violation_resolution USING btree (violation_id);


--
-- Name: mv_dashboard_summary_cms; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_dashboard_summary_cms ON public.mv_dashboard_summary USING btree (cms_id);


--
-- Name: mv_partner_summary_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mv_partner_summary_id ON public.mv_partner_summary USING btree (partner_id);


--
-- Name: channel set_timestamp_channel; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_channel BEFORE UPDATE ON public.channel FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: cms set_timestamp_cms; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_cms BEFORE UPDATE ON public.cms FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: contract set_timestamp_contract; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_contract BEFORE UPDATE ON public.contract FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: employee set_timestamp_employee; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_employee BEFORE UPDATE ON public.employee FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: partner set_timestamp_partner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_partner BEFORE UPDATE ON public.partner FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: policy set_timestamp_policy; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_policy BEFORE UPDATE ON public.policy FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: submission set_timestamp_submission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_submission BEFORE UPDATE ON public.submission FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: video set_timestamp_video; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_video BEFORE UPDATE ON public.video FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: violation set_timestamp_violation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_violation BEFORE UPDATE ON public.violation FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: channel channel_cms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_cms_id_fkey FOREIGN KEY (cms_id) REFERENCES public.cms(id) ON DELETE SET NULL;


--
-- Name: channel channel_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id) ON DELETE SET NULL;


--
-- Name: channel channel_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.partner_user(id) ON DELETE SET NULL;


--
-- Name: channel channel_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topic(id) ON DELETE SET NULL;


--
-- Name: comment comment_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comment(id) ON DELETE CASCADE;


--
-- Name: contract_channel contract_channel_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_channel
    ADD CONSTRAINT contract_channel_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: contract_channel contract_channel_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_channel
    ADD CONSTRAINT contract_channel_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contract(id) ON DELETE CASCADE;


--
-- Name: contract contract_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract
    ADD CONSTRAINT contract_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id) ON DELETE RESTRICT;


--
-- Name: partner_alert partner_alert_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_alert
    ADD CONSTRAINT partner_alert_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE SET NULL;


--
-- Name: partner_alert partner_alert_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_alert
    ADD CONSTRAINT partner_alert_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id) ON DELETE CASCADE;


--
-- Name: partner_alert partner_alert_partner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_alert
    ADD CONSTRAINT partner_alert_partner_user_id_fkey FOREIGN KEY (partner_user_id) REFERENCES public.partner_user(id) ON DELETE SET NULL;


--
-- Name: partner_contract partner_contract_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_contract
    ADD CONSTRAINT partner_contract_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE SET NULL;


--
-- Name: partner_contract partner_contract_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_contract
    ADD CONSTRAINT partner_contract_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id) ON DELETE CASCADE;


--
-- Name: partner partner_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.partner(id) ON DELETE SET NULL;


--
-- Name: partner_user partner_user_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_user
    ADD CONSTRAINT partner_user_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id) ON DELETE CASCADE;


--
-- Name: submission submission_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission
    ADD CONSTRAINT submission_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE SET NULL;


--
-- Name: submission_log submission_log_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_log
    ADD CONSTRAINT submission_log_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submission(id) ON DELETE CASCADE;


--
-- Name: submission submission_partner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission
    ADD CONSTRAINT submission_partner_user_id_fkey FOREIGN KEY (partner_user_id) REFERENCES public.partner_user(id) ON DELETE SET NULL;


--
-- Name: topic topic_cms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic
    ADD CONSTRAINT topic_cms_id_fkey FOREIGN KEY (cms_id) REFERENCES public.cms(id) ON DELETE SET NULL;


--
-- Name: video video_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video
    ADD CONSTRAINT video_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: violation violation_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation
    ADD CONSTRAINT violation_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: violation violation_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation
    ADD CONSTRAINT violation_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policy(id) ON DELETE SET NULL;


--
-- Name: violation_resolution violation_resolution_violation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation_resolution
    ADD CONSTRAINT violation_resolution_violation_id_fkey FOREIGN KEY (violation_id) REFERENCES public.violation(id) ON DELETE CASCADE;


--
-- Name: mv_dashboard_summary; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.mv_dashboard_summary;


--
-- Name: mv_partner_summary; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.mv_partner_summary;


--
-- PostgreSQL database dump complete
--

\unrestrict d3558lcGVDCp1Usd3IZmW3CXdmlfB840seq7TE7WPGic3yIwu51ToSAY1FQAvLR

