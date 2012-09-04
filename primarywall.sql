SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `primarywall`
--

-- --------------------------------------------------------

--
-- Table structure for table `domain`
--

CREATE TABLE IF NOT EXISTS `domain` (
  `domainID` varchar(99) NOT NULL COMMENT 'The subdomain IE chocolate',
  `JSON` text NOT NULL COMMENT 'The Owner and Members of the subdomain',
  PRIMARY KEY (`domainID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `note`
--

CREATE TABLE IF NOT EXISTS `note` (
  `guid` varchar(99) NOT NULL,
  `JSON` text NOT NULL,
  PRIMARY KEY (`guid`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `pt_emails`
--

CREATE TABLE IF NOT EXISTS `pt_emails` (
  `id` varchar(20) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `content` text NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `pt_subscription`
--

CREATE TABLE IF NOT EXISTS `pt_subscription` (
  `domain` varchar(200) NOT NULL,
  `email` varchar(200) NOT NULL,
  `welcome_email_sent` int(1) NOT NULL,
  `week_email_sent` int(1) NOT NULL,
  `month_email_sent` int(1) NOT NULL,
  `expired_email_sent` int(1) NOT NULL,
  `paid` int(1) NOT NULL,
  `deleted` varchar(200) NOT NULL,
  `subscription_date` date NOT NULL,
  `expires_date` date NOT NULL,
  PRIMARY KEY (`domain`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `registration`
--

CREATE TABLE IF NOT EXISTS `registration` (
  `registrationID` varchar(99) NOT NULL,
  `JSON` text NOT NULL,
  PRIMARY KEY (`registrationID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `reset`
--

CREATE TABLE IF NOT EXISTS `reset` (
  `resetID` varchar(20) NOT NULL,
  `JSON` text NOT NULL,
  PRIMARY KEY (`resetID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `session`
--

CREATE TABLE IF NOT EXISTS `session` (
  `sessionID` varchar(99) NOT NULL,
  `JSON` text NOT NULL,
  PRIMARY KEY (`sessionID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE IF NOT EXISTS `user` (
  `UserID` varchar(99) NOT NULL COMMENT 'The User ID',
  `JSON` text NOT NULL COMMENT 'JSON values about this user',
  PRIMARY KEY (`UserID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `wall`
--

CREATE TABLE IF NOT EXISTS `wall` (
  `wallID` varchar(80) NOT NULL COMMENT 'The ID of the Wall',
  `JSON` text NOT NULL COMMENT 'The JSON data about this wall',
  PRIMARY KEY (`wallID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
