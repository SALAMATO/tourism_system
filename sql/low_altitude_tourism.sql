-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: low_altitude_tourism
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
INSERT INTO `auth_group` VALUES (1,'管理员');
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

LOCK TABLES `auth_group_permissions` WRITE;
/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
INSERT INTO `auth_group_permissions` VALUES (1,1,1),(2,1,2),(3,1,3),(4,1,4),(5,1,5),(6,1,6),(7,1,7),(8,1,8),(9,1,9),(10,1,10),(11,1,11),(12,1,12),(13,1,13),(14,1,14),(15,1,15),(16,1,16),(17,1,17),(18,1,18),(19,1,19),(20,1,20),(21,1,21),(22,1,22),(23,1,23),(24,1,24),(25,1,25),(26,1,26),(27,1,27),(28,1,28),(29,1,29),(30,1,30),(31,1,31),(32,1,32),(33,1,33),(34,1,34),(35,1,35),(36,1,36),(37,1,37),(38,1,38),(39,1,39),(40,1,40),(41,1,41),(42,1,42),(43,1,43),(44,1,44),(45,1,45),(46,1,46),(47,1,47),(48,1,48),(49,1,49),(50,1,50),(51,1,51),(52,1,52),(53,1,53),(54,1,54),(55,1,55),(56,1,56);
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add log entry',1,'add_logentry'),(2,'Can change log entry',1,'change_logentry'),(3,'Can delete log entry',1,'delete_logentry'),(4,'Can view log entry',1,'view_logentry'),(5,'Can add permission',3,'add_permission'),(6,'Can change permission',3,'change_permission'),(7,'Can delete permission',3,'delete_permission'),(8,'Can view permission',3,'view_permission'),(9,'Can add group',2,'add_group'),(10,'Can change group',2,'change_group'),(11,'Can delete group',2,'delete_group'),(12,'Can view group',2,'view_group'),(13,'Can add content type',4,'add_contenttype'),(14,'Can change content type',4,'change_contenttype'),(15,'Can delete content type',4,'delete_contenttype'),(16,'Can view content type',4,'view_contenttype'),(17,'Can add session',5,'add_session'),(18,'Can change session',5,'change_session'),(19,'Can delete session',5,'delete_session'),(20,'Can view session',5,'view_session'),(21,'Can add Token',6,'add_token'),(22,'Can change Token',6,'change_token'),(23,'Can delete Token',6,'delete_token'),(24,'Can view Token',6,'view_token'),(25,'Can add Token',7,'add_tokenproxy'),(26,'Can change Token',7,'change_tokenproxy'),(27,'Can delete Token',7,'delete_tokenproxy'),(28,'Can view Token',7,'view_tokenproxy'),(29,'Can add 旅游目的地',8,'add_destination'),(30,'Can change 旅游目的地',8,'change_destination'),(31,'Can delete 旅游目的地',8,'delete_destination'),(32,'Can view 旅游目的地',8,'view_destination'),(33,'Can add 新闻资讯',10,'add_news'),(34,'Can change 新闻资讯',10,'change_news'),(35,'Can delete 新闻资讯',10,'delete_news'),(36,'Can view 新闻资讯',10,'view_news'),(37,'Can add 政策法规',11,'add_policy'),(38,'Can change 政策法规',11,'change_policy'),(39,'Can delete 政策法规',11,'delete_policy'),(40,'Can view 政策法规',11,'view_policy'),(41,'Can add 安全隐患',12,'add_safetyalert'),(42,'Can change 安全隐患',12,'change_safetyalert'),(43,'Can delete 安全隐患',12,'delete_safetyalert'),(44,'Can view 安全隐患',12,'view_safetyalert'),(45,'Can add 用户',14,'add_user'),(46,'Can change 用户',14,'change_user'),(47,'Can delete 用户',14,'delete_user'),(48,'Can view 用户',14,'view_user'),(49,'Can add 留言反馈',9,'add_message'),(50,'Can change 留言反馈',9,'change_message'),(51,'Can delete 留言反馈',9,'delete_message'),(52,'Can view 留言反馈',9,'view_message'),(53,'Can add 统计数据',13,'add_statistic'),(54,'Can change 统计数据',13,'change_statistic'),(55,'Can delete 统计数据',13,'delete_statistic'),(56,'Can view 统计数据',13,'view_statistic');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `authtoken_token`
--

DROP TABLE IF EXISTS `authtoken_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `authtoken_token` (
  `key` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `created` datetime(6) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `authtoken_token_user_id_35299eff_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `authtoken_token`
--

LOCK TABLES `authtoken_token` WRITE;
/*!40000 ALTER TABLE `authtoken_token` DISABLE KEYS */;
INSERT INTO `authtoken_token` VALUES ('15f656a14d34779beb80fdc2e7615eaf35bebb61','2026-02-25 10:19:32.004594',2);
/*!40000 ALTER TABLE `authtoken_token` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `destinations`
--

DROP TABLE IF EXISTS `destinations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `destinations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `location` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `cover_image` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `price_range` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `duration` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `best_season` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `features` json NOT NULL,
  `rating` double NOT NULL,
  `views` int NOT NULL,
  `is_hot` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `destinations`
--

LOCK TABLES `destinations` WRITE;
/*!40000 ALTER TABLE `destinations` DISABLE KEYS */;
/*!40000 ALTER TABLE `destinations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext COLLATE utf8mb4_general_ci,
  `object_repr` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_users_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

LOCK TABLES `django_admin_log` WRITE;
/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
INSERT INTO `django_admin_log` VALUES (1,'2026-02-24 18:17:16.078358','1','管理员',1,'[{\"added\": {}}]',2,1),(2,'2026-02-24 18:28:51.798165','2','admin',2,'[{\"changed\": {\"fields\": [\"Staff status\", \"Superuser status\", \"Groups\", \"User permissions\", \"Last login\"]}}]',14,2),(3,'2026-02-24 18:31:56.486966','1','c18c79fc457cd667b4e2fd60b720d5c7e2fe5b46',1,'[{\"added\": {}}]',7,1),(4,'2026-02-24 23:28:13.150453','2','admin',2,'[{\"changed\": {\"fields\": [\"Staff status\"]}}]',14,1);
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `model` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

LOCK TABLES `django_content_type` WRITE;
/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (1,'admin','logentry'),(8,'api','destination'),(9,'api','message'),(10,'api','news'),(11,'api','policy'),(12,'api','safetyalert'),(13,'api','statistic'),(14,'api','user'),(2,'auth','group'),(3,'auth','permission'),(6,'authtoken','token'),(7,'authtoken','tokenproxy'),(4,'contenttypes','contenttype'),(5,'sessions','session');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

LOCK TABLES `django_migrations` WRITE;
/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'contenttypes','0001_initial','2026-02-24 18:12:35.810230'),(2,'contenttypes','0002_remove_content_type_name','2026-02-24 18:12:35.849674'),(3,'auth','0001_initial','2026-02-24 18:12:35.948158'),(4,'auth','0002_alter_permission_name_max_length','2026-02-24 18:12:35.972676'),(5,'auth','0003_alter_user_email_max_length','2026-02-24 18:12:35.976153'),(6,'auth','0004_alter_user_username_opts','2026-02-24 18:12:35.979181'),(7,'auth','0005_alter_user_last_login_null','2026-02-24 18:12:35.982004'),(8,'auth','0006_require_contenttypes_0002','2026-02-24 18:12:35.983227'),(9,'auth','0007_alter_validators_add_error_messages','2026-02-24 18:12:35.986445'),(10,'auth','0008_alter_user_username_max_length','2026-02-24 18:12:35.989950'),(11,'auth','0009_alter_user_last_name_max_length','2026-02-24 18:12:35.993176'),(12,'auth','0010_alter_group_name_max_length','2026-02-24 18:12:36.001248'),(13,'auth','0011_update_proxy_permissions','2026-02-24 18:12:36.005419'),(14,'auth','0012_alter_user_first_name_max_length','2026-02-24 18:12:36.008506'),(15,'api','0001_initial','2026-02-24 18:12:36.217002'),(16,'admin','0001_initial','2026-02-24 18:12:36.273816'),(17,'admin','0002_logentry_remove_auto_add','2026-02-24 18:12:36.277963'),(18,'admin','0003_logentry_add_action_flag_choices','2026-02-24 18:12:36.282643'),(19,'authtoken','0001_initial','2026-02-24 18:12:36.318282'),(20,'authtoken','0002_auto_20160226_1747','2026-02-24 18:12:36.336208'),(21,'authtoken','0003_tokenproxy','2026-02-24 18:12:36.337906'),(22,'authtoken','0004_alter_tokenproxy_options','2026-02-24 18:12:36.340204'),(23,'sessions','0001_initial','2026-02-24 18:12:36.356096');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `session_data` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

LOCK TABLES `django_session` WRITE;
/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
INSERT INTO `django_session` VALUES ('h5xlcct6pldww2kl047kt5uhv60br1ak','.eJxVjEEOwiAQAP-yZ0OA0nbp0btvIAu7SNXQpLQn499Nkx70OjOZNwTatxL2JmuYGSYwcPllkdJT6iH4QfW-qLTUbZ2jOhJ12qZuC8vrerZ_g0KtwAQdDV5HYds5Mw6DTzaPNntvncvO9IYpE6Em1NFjHoUxieaMKNj1NjJ8vtflOBY:1vuz5S:G_WK1k8S99blo6pbOrHoH-LV7sNe3SvgorW3MJ8N1fs','2026-03-10 20:32:54.721340');
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_general_ci NOT NULL,
  `message_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `reply` longtext COLLATE utf8mb4_general_ci,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `messages_user_id_70242949_fk_users_id` (`user_id`),
  CONSTRAINT `messages_user_id_70242949_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,'张叁先生','zhangsan@qq.com','建议','我对低空旅游非常感兴趣，想了解如何办理飞行员资质证书？需要什么条件和流程？','您好！办理飞行员资质证书需要：1.年满18周岁以上；2.身体健康，通过航空体检；3.完成指定培训机构的理论和实际飞行培训；4.通过民航局考试。具体可咨询当地航空协会或培训机构。','已回复','2026-02-24 20:09:27.087084','2026-02-24 23:24:10.697951',3),(2,'李斯','lisi@qq.com','建议','建议增加更多的低空旅游项目，尤其是在二三线城市，让更多人能够体验低空飞行的乐趣。','感谢您对低空旅游项目提出的宝贵建议！\n\n您提到“增加更多低空旅游项目，尤其是在二三线城市推广，让更多人体验低空飞行的乐趣”的建议非常具有建设性。我们也高度认同低空旅游在区域文旅升级和城市品牌打造中的重要作用。\n\n目前，我们正在积极推进低空旅游示范线路建设，并与多地政府及企业沟通合作，探索在具备空域条件和配套设施的城市落地更多体验项目。未来将重点关注二三线城市的发展潜力，结合当地自然景观与特色资源，打造更加多样化、亲民化的低空旅游产品。\n\n再次感谢您对平台建设和低空旅游发展的关注与支持。您的意见对我们持续优化服务具有重要参考价值。后续如有新的项目进展，我们也会通过官网及公告及时发布。\n\n祝您生活愉快，期待您继续关注与支持！','已回复','2026-02-24 23:19:17.441429','2026-02-24 23:23:26.009639',4),(4,'远航智能飞行公司','yuanhang@gmail.com','合作','\"根据行业实践与调研情况，目前低空旅游在发展过程中存在以下问题：\n\n（一）空域审批流程复杂\n审批周期较长\n跨部门协调难度较大\n临时飞行申请流程不够灵活\n\n（二）安全监管标准不统一\n不同地区执行标准存在差异\n应急预案体系尚不完善\n数据共享机制不足\n\n（三）配套基础设施不足\n起降点规划不足\n低空航线网络建设滞后\n智能调度系统缺乏统一平台\n\n（四）产业扶持政策不明确\n财政补贴与税收优惠政策有限\n融资渠道较窄\n企业创新支持力度不足\"','','待回复','2026-02-24 23:39:48.310719','2026-02-24 23:39:48.310738',1),(5,'王武','wangwu@163.com','建议','希望加强对低空旅游安全的监管，建立更加严格的安全标准和审查机制。','感谢您的建议！安全是低空旅游的生命线。我们已将您的建议反馈给相关部门，并将持续加强安全监管体系建设。','已回复','2026-02-25 10:20:41.608198','2026-02-25 10:21:03.899629',2);
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news`
--

DROP TABLE IF EXISTS `news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `news` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `author` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `cover_image` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `content` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `publish_date` datetime(6) NOT NULL,
  `views` int NOT NULL,
  `tags` json NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news`
--

LOCK TABLES `news` WRITE;
/*!40000 ALTER TABLE `news` DISABLE KEYS */;
INSERT INTO `news` VALUES (1,'2024低空经济元年：上半年游客突破500万人次','行业动态','张记者','https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAERG5NpnER93SyiRTzTXK4I8nW_uHDsWAACeSMAAulJ4VQuJFijio_-uToE.jpg','\"2024年被业界称为“低空经济元年”，各地低空旅游项目陷入热潮。据统计，今年上半年全国低空旅游游客突破500万人次，同比增长45%。\n直升机观光、热气球体验、滑翔伞飞行等项目受到广大游客青睐。业内人士认为，随着政策支持和技术进步，低空旅游将迎来更大发展机遇。\n作为一种新兴的综合性经济形态，今年低空经济尚未“展翅腾飞”，但已处于“滑行”“蓄势”的阶段。宏观上，重要会议给予低空经济极高的定位，工信部等部门明确了一系列发展目标，各地力争成为低空经济“头雁”。微观上，资本如群蜂逐蜜涌现低空经济产业链，明星融资事件层出不穷，一批独角兽诞生。在产业链终端，应用如百花齐放，低空经济触角伸向物流配送、农林植保、交通接驳等场景，正渐渐走向成熟。\"','2024-06-15 23:00:00.000000',1442,'[\"低空经济\", \"行业报告\", \"数据统计\"]','2024-06-15 23:00:00.000000','2026-02-25 10:05:17.974427'),(2,'国家新政释放重大利好，低空旅游迎来黄金发展期','政策解读','李专家','https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAERG21pnD3tAy6_rzNFqq7PhDBm3JgvAwACLiMAAulJ4VRs3-HnZdpABjoE.jpg','\"近日，国务院办公厅发布了关于促进低空经济发展的指导意见，从多个方面为低空旅游发展提供了政策支持。\n在政策红利持续释放与市场需求加速升级的双重驱动下，我国低空经济与文旅产业融合发展呈现出多维特征，为相关产业绘就高质量发展新图景。一方面，政策支撑体系日趋完善，形成全国统筹、地方协同的发展格局。低空经济连续两年被写入《政府工作报告》，《无人驾驶航空器飞行管理暂行条例》等政策相继出台，从空域管理、基础设施、安全监管等方面提供系统性保障。\n另一方面，“低空+文旅”应用场景不断丰富，从单一观光向多元融合拓展。既有直升机低空游览、热气球环游等传统项目升级，也有无人机灯光秀、低空演艺等新业态涌现。\n此外，区域协同特征凸显，产业链联动效应逐步显现。川渝构建“审批一体化、管理协同化”的跨省低空飞行机制，打造3条低空大通道，推动文旅资源跨区域整合，助力餐饮、住宿、文创等关联产业升级，构建起立体化文旅发展网络。\"','2024-03-01 10:05:55.217000',851,'[\"政策解读\", \"国家政策\"]','2026-02-25 10:05:55.257854','2026-02-25 10:08:45.113663'),(3,'新型电动飞行器亮相博览会，引领低空旅游新潮流','技术创新','王编辑','https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAERG3ZpnD9w0WSvt-cvk-SJ2fHTPe7sgAACQiMAAulJ4VQKjEzeaQqMODoE.jpg','\"在今年的低空经济博览会上，多家企业展示了最新的eVTOL（电动垂直起降飞行器）技术，引发广泛关注；\n未来，随着eVTOL的制造和运营成本规模化后，花5分钟、60元“打飞的”的跨城交通新模式，将逐步走进人们的日常生活。\n为了加快推动低空经济产业发展布局，上海已出台相关行动方案，计划到2027年，核心产业规模达到500亿元以上，在全球低空经济创新发展中走在前列。\n12月19日上午，新兴载人eVTOL（电动垂直起降）飞行器在鹿城区江心屿西园稳稳升至空中30米，完成在鹿城的首次公开演示飞行。\n此次完成首次无人驾驶载人飞行演示的亿航EH216-S航空器，是获得中国民航局颁发的型号合格证、生产许可证、标准适航证三大“通行证”的无人驾驶载人电动垂直起降航空器（eVTOL），是全球首款也是唯一一款获得“三证”的载人eVTOL。\n其最大特点是，可以实现无人驾驶，乘客（可承载两人）无需做任何操作，航空器会根据提前设置好的航线，实现空中点对点飞行。记者在现场看到，亿航EH216-S航空器启动后垂直上升，在空中沿三角形轨道平稳完成演示飞行后垂直降落回江心屿兴龙航空停机坪。\n据鹿城区交通运输局相关负责人介绍，江心屿可以利用现有起降场地且空域条件好，飞行安全系数高。1933年，近代温州乃至浙江最早及唯一的民用机场便诞生于江心屿水上机场，在温州可以搭乘水上飞机去广州、上海，乃至香港。本次新兴载人eVTOL（电动垂直起降）飞行器在江心屿首飞，更是现代科技对历史记忆的延续。\n今年6月，亿航EH216-S航空器在文成首飞。广州亿航智能技术有限公司相关工作人员介绍，目前，亿航EH216-S航空器正在进行民用无人驾驶航空器运营合格证取证工作，未来将开拓更多实用飞行场景，稳步推进EH216-S的商业运营。\"','2024-12-20 10:06:42.616000',3207,'[\"eVTOL\", \"技术创新\", \"绿色飞行\"]','2026-02-25 10:06:42.626163','2026-02-25 10:07:40.690859');
/*!40000 ALTER TABLE `news` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `policies`
--

DROP TABLE IF EXISTS `policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `level` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `department` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `publish_date` datetime(6) NOT NULL,
  `content` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `cover_image` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_url` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tags` json NOT NULL,
  `views` int NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `policies`
--

LOCK TABLES `policies` WRITE;
/*!40000 ALTER TABLE `policies` DISABLE KEYS */;
INSERT INTO `policies` VALUES (1,'广东省低空旅游产业发展规划（2024-2026年）','省级','产业规划','广东省发展和改革委员会','2024-03-01 00:00:00.000000','\"根据国家低空经济发展战略，结合广东省实际，制定本规划。\n发展目标：到2026年，建成全国领先的低空旅游示范省，形成完善的产业体系。\n重点布局：珠三角核心区、粤东粤西粤北特色区。\n保障措施：政策支持、资金扶持、人才引进。\"',NULL,'https://www.gd.gov.cn/zwgk/wjk/qbwj/yfb/content/post_4427812.html','[\"产业规划\", \"地方政策\", \"广东省\"]',2615,'2026-02-24 22:37:59.881126','2026-02-25 10:22:43.603927'),(2,'低空旅游飞行活动安全管理规定','国家级','安全管理','中国民用航空局','2024-01-31 00:00:00.000000','\"根据《民用航空法》的条文\n第一条 为规范低空旅游飞行活动，保障飞行安全，根据《民用航空法》等法律法规，制定本规定。\n第二条 本规定适用于在中国境内从事低空旅游飞行活动的单位和个人。\n第三条 从事低空旅游飞行活动应当具备相应资质，遵守飞行规则，确保飞行安全。\"',NULL,'https://xxgk.mot.gov.cn/2020/gz/202112/W020211224389643228440.pdf','[\"安全管理\", \"飞行规范\", \"资质要求\"]',1451,'2026-02-25 10:17:22.583095','2026-02-25 10:22:33.903262'),(3,'《大连市低空飞行服务管理暂行办法》','市级','安全管理、政策办法','大连市','2025-06-20 00:00:00.000000','本市行政区域内低空飞行运营及相关服务管理活动，适用《暂行办法》。本市设立低空飞行服务管理中心，在空中交通管理机构和市交通运输局指导下，开展本市低空飞行服务管理工作，协助承担低空飞行服务保障和低空空域的协同管理相关工作。',NULL,'https://www.dl.gov.cn/art/2025/6/13/art_8741_2444791.html','[\"政策解读\"]',1315,'2026-02-25 10:18:22.932826','2026-02-25 10:22:35.803329');
/*!40000 ALTER TABLE `policies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `safety_alerts`
--

DROP TABLE IF EXISTS `safety_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `safety_alerts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `risk_level` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `prevention` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `emergency_plan` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `report_date` datetime(6) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `safety_alerts`
--

LOCK TABLES `safety_alerts` WRITE;
/*!40000 ALTER TABLE `safety_alerts` DISABLE KEYS */;
INSERT INTO `safety_alerts` VALUES (1,'夏季雷雨天气对飞行安全的影响','高','天气因素','夏季雷雨天气频繁，对低空飞行安全构成重大威胁。雷电可能损坏飞行器电子设备，强对流天气会影响飞行稳定性。','\"1.建立实时气象监测系统\n2.制定严格的天气标准，雷雨天气禁止飞行\n3.加强飞行员气象知识培训\n4.安装防雷设备\"','\"1.立即停止所有飞行活动\n2.将飞行器迅速降落至安全区域\n3.启动应急通信系统\n4.组织人员疏散\n5.等待天气好转后再恢复运营\"','2026-02-25 10:11:17.788000','处理中','2026-02-25 10:11:17.801953','2026-02-25 10:11:17.801963'),(2,'老旧飞行器安全隐患排查','中','设备维护','部分飞行器由于使用频率高、维护不当，出现老化现象。主要表现为发动机性能下降、结构件疲劳、电子设备故障率增加。','\"1.制定严格的定期维护计划\n2.建立飞行器使用小时台账\n3.对老旧飞行器进行重点检查\n4.定期更换易损件\"','\"1.立即停飞受损飞行器\n2.进行全面安全检查\n3.更换损坏部件\n4.经专业机构鉴定合格后方可复飞\n5.建立设备档案\"','2026-02-25 10:11:37.493000','已解决','2026-02-25 10:11:37.499540','2026-02-25 10:12:10.809253'),(3,'从业人员安全意识不足问题','中','人员管理','随着行业快速发展，部分从业人员缺乏系统培训，安全意识薄弱。发现部分飞行员违反操作规程现象。','\"1.完善从业人员资格认证体系\n2.加强安全培训和考核\n3.定期开展安全演练\n4.建立奖惩机制\"','\"1.暂停违规人员工作资格\n2.组织安全培训\n3.考核合格后方可上岗\n4.建立从业人员黑名单制度\"','2026-02-25 10:12:00.551000','待处理','2026-02-25 10:12:00.557907','2026-02-25 10:12:00.557917');
/*!40000 ALTER TABLE `safety_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `statistics`
--

DROP TABLE IF EXISTS `statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `statistics` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `region` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `year` int NOT NULL,
  `tourist_count` double NOT NULL,
  `revenue` double NOT NULL,
  `flight_count` int NOT NULL,
  `aircraft_count` int NOT NULL,
  `growth_rate` double NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `statistics_region_year_2da424f3_uniq` (`region`,`year`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `statistics`
--

LOCK TABLES `statistics` WRITE;
/*!40000 ALTER TABLE `statistics` DISABLE KEYS */;
INSERT INTO `statistics` VALUES (1,'广东省',2024,110,85000,3200,45,28.5,'2026-02-24 23:03:08.740911','2026-02-25 09:06:03.922956'),(2,'浙江省',2024,95,72000,2800,38,32,'2026-02-24 23:36:45.022395','2026-02-24 23:36:45.022408'),(3,'广东省',2025,130,95000,3600,45,30,'2026-02-24 23:37:29.584351','2026-02-24 23:37:29.584370'),(5,'上海市',2024,105,88000,2950,42,25.8,'2026-02-25 09:54:07.733950','2026-02-25 10:23:18.692524'),(6,'北京市',2024,85,68000,2500,35,30.2,'2026-02-25 09:54:30.217178','2026-02-25 09:54:30.217198'),(7,'四川省',2024,70,55000,2100,28,35.5,'2026-02-25 09:54:48.435865','2026-02-25 09:54:48.435882'),(8,'云南省',2024,65,48000,1800,25,38,'2026-02-25 09:55:05.997595','2026-02-25 09:55:05.997613'),(9,'海南省',2024,80,62000,2200,30,27.5,'2026-02-25 09:55:22.572867','2026-02-25 09:55:22.572884'),(10,'江苏省',2024,93,71000,2350,32,29,'2026-02-25 09:55:40.490961','2026-02-25 09:55:40.490985'),(11,'重庆市',2024,75,70000,2300,30,27,'2026-02-25 09:55:59.610418','2026-02-25 09:55:59.610435'),(12,'贵州省',2024,50,40000,1600,25,31,'2026-02-25 09:56:44.352936','2026-02-25 09:56:44.352955'),(13,'浙江省',2025,100,68000,3000,38,20,'2026-02-25 09:57:48.009323','2026-02-25 09:57:48.009340'),(14,'上海市',2025,130,80000,3100,42,18,'2026-02-25 09:58:45.962963','2026-02-25 09:58:45.962980'),(15,'北京市',2025,90,61000,2800,35,25,'2026-02-25 09:59:53.436679','2026-02-25 09:59:53.436703'),(16,'四川省',2025,75,46000,2300,28,29.5,'2026-02-25 10:01:01.733595','2026-02-25 10:01:01.733613'),(17,'云南省',2025,70,43000,2000,30,31,'2026-02-25 10:02:07.412104','2026-02-25 10:02:07.412122'),(18,'海南省',2025,100,51000,2400,30,28,'2026-02-25 10:02:45.637819','2026-02-25 10:02:45.637841'),(19,'江苏省',2025,75,60000,2000,32,19,'2026-02-25 10:03:21.129037','2026-02-25 10:03:21.129053'),(20,'重庆市',2025,95,71000,2400,30,28,'2026-02-25 10:03:53.616679','2026-02-25 10:03:53.616698'),(21,'贵州省',2025,35,21000,1200,25,12,'2026-02-25 10:04:27.533359','2026-02-25 10:04:27.533377');
/*!40000 ALTER TABLE `statistics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `password` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `first_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `last_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_general_ci NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  `phone` varchar(11) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `avatar` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bio` longtext COLLATE utf8mb4_general_ci,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'pbkdf2_sha256$1200000$KfqGrtxNoWXeRoFL99TNUL$E2HrQYtkO90hisa+kEfTyG4L7tqD8gzLzLwtJCMG0FY=','2026-02-24 20:32:54.719257',1,'SLMT','','','lonelyslmt@qq.com',1,1,'2026-02-24 18:16:28.381674','15218029811',NULL,NULL,'2026-02-24 18:16:28.709458'),(2,'pbkdf2_sha256$1200000$VkIJvfIXD0kNJG1zNDXgHY$T6VRSTQJ5SG6veP42nLvKr6/Mp98Jc1ZrA0AjabkKnQ=','2026-02-24 18:25:00.000000',0,'admin','','','admin@example.com',1,1,'2026-02-24 18:24:00.000000','13611110000',NULL,NULL,'2026-02-24 18:24:45.222634'),(3,'pbkdf2_sha256$1200000$aEYkrVjJvu10AqMZ8ugul8$E1MSPXZ2uR3oQM1fgfehtSf3dPQeOydFWrdRWEybvek=',NULL,0,'zhangsan','','','zhangsan@qq.com',0,1,'2026-02-24 20:06:18.695960','13905657777',NULL,NULL,'2026-02-24 20:06:19.292093'),(4,'pbkdf2_sha256$1200000$ZiwYQs0fuORuG1ZjNZJ3Ez$9atJpYbo2IN84tr8mMPS3YRnDsEt9YK5czLOLdJ7fng=',NULL,0,'lisi','','','lisi@qq.com',0,1,'2026-02-24 23:20:26.081925','13411110000',NULL,NULL,'2026-02-24 23:20:26.674819');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_groups`
--

DROP TABLE IF EXISTS `users_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_groups_user_id_group_id_fc7788e8_uniq` (`user_id`,`group_id`),
  KEY `users_groups_group_id_2f3517aa_fk_auth_group_id` (`group_id`),
  CONSTRAINT `users_groups_group_id_2f3517aa_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `users_groups_user_id_f500bee5_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_groups`
--

LOCK TABLES `users_groups` WRITE;
/*!40000 ALTER TABLE `users_groups` DISABLE KEYS */;
INSERT INTO `users_groups` VALUES (1,2,1);
/*!40000 ALTER TABLE `users_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_user_permissions`
--

DROP TABLE IF EXISTS `users_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_permissions_user_id_permission_id_3b86cbdf_uniq` (`user_id`,`permission_id`),
  KEY `users_user_permissio_permission_id_6d08dcd2_fk_auth_perm` (`permission_id`),
  CONSTRAINT `users_user_permissio_permission_id_6d08dcd2_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `users_user_permissions_user_id_92473840_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_user_permissions`
--

LOCK TABLES `users_user_permissions` WRITE;
/*!40000 ALTER TABLE `users_user_permissions` DISABLE KEYS */;
INSERT INTO `users_user_permissions` VALUES (1,2,1),(2,2,2),(3,2,3),(4,2,4),(5,2,5),(6,2,6),(7,2,7),(8,2,8),(9,2,9),(10,2,10),(11,2,11),(12,2,12),(13,2,13),(14,2,14),(15,2,15),(16,2,16),(17,2,17),(18,2,18),(19,2,19),(20,2,20),(21,2,21),(22,2,22),(23,2,23),(24,2,24),(25,2,25),(26,2,26),(27,2,27),(28,2,28),(29,2,29),(30,2,30),(31,2,31),(32,2,32),(33,2,33),(34,2,34),(35,2,35),(36,2,36),(37,2,37),(38,2,38),(39,2,39),(40,2,40),(41,2,41),(42,2,42),(43,2,43),(44,2,44),(45,2,45),(46,2,46),(47,2,47),(48,2,48),(49,2,49),(50,2,50),(51,2,51),(52,2,52),(53,2,53),(54,2,54),(55,2,55),(56,2,56);
/*!40000 ALTER TABLE `users_user_permissions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-25 18:27:57
